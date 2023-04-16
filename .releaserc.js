module.exports = {
    // https://github.com/semantic-release/semantic-release/blob/master/docs/extending/plugins-list.md
    plugins: [
      [
        '@semantic-release/commit-analyzer',
        {
          preset: 'conventionalcommits',
        },
      ],
      [
        '@semantic-release/release-notes-generator',
        {
          preset: 'conventionalcommits',
        },
      ],
      // disabled due to authentication https://github.com/semantic-release/git#git-authentication
      [
        '@semantic-release/changelog',
        {
          changelogTitle: `<!-- markdownlint-configure-file {"MD024": { "siblings_only": true }, "MD012": false } -->
  # Changelog

  All notable changes to this project will be documented in this file.

  The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).`,
        },
      ],
      [
        '@semantic-release/npm',
        {
          npmPublish: false,
          tarballDir: '.',
        },
      ],
      [
        '@semantic-release/git',
        {
          message: 'chore(release): ${nextRelease.version} ${nextRelease.notes}',
          assets: ['CHANGELOG.md', 'package.json', 'package-lock.json'],
        },
      ],
      [
        '@semantic-release/github',
        {
          // https://github.com/semantic-release/semantic-release/issues/2204#issuecomment-1486299917
          // successComment:
            // ":tada: This ${issue.pull_request ? 'pull request' : 'issue'} is included in [version ${nextRelease.version}](${releases.filter(release => /github.com/i.test(release.url))[0].url}) :tada:",
          successComment: false,
          failTitle: false,
          assets: ['*.tgz'],
        },
      ],
    ],
    tagFormat: '${version}',
    branches: [{ name: 'master' }],
  };
