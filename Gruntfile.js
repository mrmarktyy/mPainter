module.exports = function(grunt) {

    var bannerContent = '/*!\n' + 
                    '<%= pkg.name %> v<%= pkg.version %> \n' +
                    'Author: <%= pkg.author %> \n' + 
                    'Date: <%= grunt.template.today("yyyy-mm-dd") %> \n' +
                    'License: <%= pkg.license %> \n'+ 
                    '*/\n';

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),

        uglify: {
            options: {
                banner: bannerContent,
            },
            target: {
                src: ['src/**/*.js'],
                dest: 'dist/<%= pkg.name %>.min.js'
            }
        
        },
        jshint: {
            options: {
                eqeqeq: true,
                trailing: true
            },
            target: {
                src : ['src/**/*.js']
            }
        }
    });
    
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-uglify');

    grunt.registerTask('dev', ['jshint', 'uglify']);
};