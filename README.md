# tests-coverage-report

![node-version][node-version]
![coverage][coverage-badge]
![semrel][semrel-badge]

## About

Github Action for coverage report as a comment

* [Contributing](#contributing)
* [Usage](#usage)
* [Customizing](#customizing)
  * [inputs](#inputs)
* [Output Examples](#output-examples)

## Contributing

1. Install pre-commit

    ```shell
    pre-commit install --install-hooks -t pre-commit -t commit-msg
    ```

2. @vercel/ncc is in use to compile the code and modules into one file used for distribution.
   After adding your code, run package script. `npm run package`

3. Open a pull-request

## Usage

```yaml
name: Tests With Coverage Report
concurrency:
  group: Tests-Coverage-Report-${{ github.head_ref }}
  cancel-in-progress: true
on:
  workflow_dispatch: null
  pull_request: null
jobs:
  tests-with-coverage:
    timeout-minutes: 5
    runs-on: ubuntu-20.04
    steps:
    - name: checkout
      uses: actions/checkout@v3.3.0
      with:
        fetch-depth: 0

    - name: Use Node.js 18
      uses: actions/setup-node@v3
      with:
        node-version: 18
        cache: npm

    - name: Run Clean Install
      run: npm ci

    - name: Run Build
      run: npm run build

    - name: Run Tests
      run: npm run test

    - name: Coverage Report
      if: always()
      uses: aGallea/tests-coverage-report@v1
      with:
        min-coverage-percentage: '90'
        fail-under-coverage-percentage: 'false'
```

## Customizing

### inputs

Following inputs can be used as `step.with` keys

| Name               | Type   | Required | Default   | Description |
|--------------------|--------|----------|-----------|-------------|
| `github-token`     | String | True     |           | GH authentication token                                    |
| `title`            | String | False    | Tests Report | Title for the comment      |
| `cobertura-path`   | String | False    | ./coverage/cobertura-coverage.xml | The location of the cobertura coverage xml file |
| `junit-path`       | String | False    | ./coverage/junit.xml | The location of the junit xml file or folder |
| `jacoco-path`      | String | False    | ./target/site/jacoco/jacoco.xml | The location of the jacoco xml file |
| `clover-path`      | String | False    | ./coverage/clover.xml | The location of the clover coverage xml file |
| `lcov-path`        | String | False    | ./coverage/lcov.info | The location of the lcov info file |
| `show-junit`       | Boolean | False    | true      | Show JUnit details on comment |
| `diffcover-ref`    | String | False    | cobertura | Diff coverage report referral |
| `show-diffcover`   | Boolean | False    | true      | Show coverage report details on comment |
| `min-coverage-percentage` | Number | False    | 80 | Minimum coverage percentage |
| `fail-under-coverage-percentage`   | Boolean | False    | false      | Fail job when coverage percentage is below the minimum |
| `show-failures-info` | Boolean | False    | false      | Show failures info on comment |
| `override-comment`   | Boolean | False    | true      | Overrides existing coverage comment |

## Output Examples

![alt text](https://github.com/aGallea/tests-coverage-report/blob/master/media/no_details.png?raw=true)
![alt text](https://github.com/aGallea/tests-coverage-report/blob/master/media/details.png?raw=true)

<!-- MARKDOWN LINKS & IMAGES -->
[node-version]:https://img.shields.io/badge/nodejs-18.13.0-blue.svg
[coverage-badge]:https://raw.githubusercontent.com/aGallea/tests-coverage-report/badges/.badges/master/coverage.svg
[semrel-badge]:https://img.shields.io/badge/semantic--release-1?logo=semantic-release
