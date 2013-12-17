'use strict';

module.exports = function(grunt){
  require('time-grunt')(grunt);
  require('load-grunt-tasks')(grunt);

  var config = {
    port: 5110
  };

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    meta: {
      version: '<%= pkg.version %>',
      banner:
        '//     Backbone.Sentinel v<%= pkg.version %>\n' +
        '//     Copyright (c) <%= grunt.template.today("yyyy") %>\n' +
        '//     <%= pkg.author %>\n' +
        '//     Distributed under MIT license\n' +
        '//     <%= pkg.repository.url %>\n' +
        '\n\n'
    },
    jshint: {
      options: {
        jshintrc: '.jshintrc'
      },
      all: ['Gruntfile.js', 'backbone.sentinel.js']
    },
    preprocess: {
      all: {
        src: 'lib/sentinel.connector.js',
        dest: 'backbone.sentinel.js',
        options: {
          context: {
            BANNER: '<%= meta.banner %>',
            VERSION: '<%= meta.version %>'
          }
        }
      }
    },
    uglify: {
      options: {
        banner: '<%= meta.banner %>'
      },
      all: {
        src: 'backbone.sentinel.js',
        dest: 'backbone.sentinel.min.js'
      }
    },
    mocha: {
      options: {
        timeout: 3000,
        ignoreleaks: false,
        reporter: 'spec',
        ui: 'bdd'
      },
      all: ['test/**/*-test.html']
    },
    docco: {
      all: {
        options: {
          output: 'docs/source'
        },
        src: './backbone.sentinel.js'
      }
    },
    connect: {
      options: {
        port: config.port,
        livereload: (config.port + 1)
      },
      livereload: {
        options: {
          open: true,
          base: ['docs/', 'docs/source']
        }
      }
    },
    copy: {
      all: {
        files: [
          {
            expand: true,
            dot: true,
            dest: 'docs/js',
            src: 'backbone.sentinel.js'
          }
        ]
      }
    },
    watch: {
      test: {
        files: ['lib/**/*.js', 'test/**/*-test.html'],
        tasks: ['mocha']
      },
      jshint: {
        files: ['Gruntfile.js', 'index.js', 'lib/**/*.js'],
        tasks: ['compile', 'jshint']
      },
      livereload: {
        options: {
          livereload: '<%= connect.options.livereload %>'
        },
        files: ['lib/**/*.js', 'docs/index.html']
      }
    }
  });

  grunt.registerTask('test',    ['mocha']);
  grunt.registerTask('compile', ['preprocess', 'copy', 'uglify']);
  grunt.registerTask('docs',    ['compile', 'docco']);
  grunt.registerTask(
    'default', ['compile', 'jshint', 'test', 'connect', 'watch']
  );

};