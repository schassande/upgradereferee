module.exports = function(grunt) {
    // Project configuration.
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        exec: {
            'app-serve': { cwd: 'app', cmd: 'ionic serve' },
            'app-version-patch': { cwd: 'app', cmd: 'npm version patch' },
            'app-version-minor': { cwd: 'app', cmd: 'npm version minor' },
            'app-version-major': { cwd: 'app', cmd: 'npm version major' },
            'app-version-patch-root': { cwd: '.', cmd: 'npm version patch' },
            'app-version-minor-root': { cwd: '.', cmd: 'npm version minor' },
            'app-version-major-root': { cwd: '.', cmd: 'npm version major' },
            'app-apply-version': { cwd: 'app', cmd: 'node ./replace.build.js' },
            'app-clean-apikey': { cwd: 'app', cmd: 'node ./clean.apikey.js' },
            'commit-version': { cwd: 'app', cmd: 'git commit -a -m "version"' },
            'git-tag': { cwd: 'app', cmd: 'git tag' },
            'app-build': { cwd: 'app', cmd: 'ionic build --prod --service-worker' },
            'deploy-app': { cwd: '.', cmd: 'firebase deploy' },
            'set-target-deploy-app': { cwd: '.', cmd: 'firebase target:apply hosting  upgrade referee-upgrade' }
        },
    });
    grunt.loadNpmTasks('grunt-exec');
    grunt.loadNpmTasks('grunt-markdown');
    grunt.loadNpmTasks('grunt-copy');
    grunt.loadNpmTasks('grunt-git-tag');

    grunt.registerTask('app-serve', 'Build the app', ['exec:app-serve']);
    grunt.registerTask('app-build', 'Build the app', ['exec:app-build']);

    grunt.registerTask('app-deploy-patch', 'Upgrade to next patch version, commit, build, deploy the app only', [
        'exec:app-version-patch-root',
        'exec:app-version-patch',
        'exec:app-apply-version',
        'exec:app-build',
        'exec:set-target-deploy-app',
        'exec:deploy-app',
        'exec:app-clean-apikey',
        'exec:commit-version'
    ]);
    grunt.registerTask('app-deploy-minor', 'Upgrade to next minor version, commit, build, deploy the app only', [
        'exec:app-version-minor-root',
        'exec:app-version-minor',
        'exec:app-apply-version',
        'exec:app-build',
        'exec:set-target-deploy-app',
        'exec:deploy-app',
        'exec:app-clean-apikey',
        'exec:commit-version'
    ]);
    grunt.registerTask('app-deploy-major', 'Upgrade to next major version, commit, build, deploy the app only', [
        'exec:app-version-major-root',
        'exec:app-version-major',
        'exec:app-apply-version',
        'exec:app-build',
        'exec:set-target-deploy-app',
        'exec:deploy-app',
        'exec:app-clean-apikey',
        'exec:commit-version'
    ]);
    grunt.registerTask('gitag', 'Commit and tag', [
        'git_tag'
    ]);
}