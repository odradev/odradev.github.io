install:
    cd docusaurus && npm install

build:
    cd docusaurus && npm run build
    rm -rf docs
    cp -r docusaurus/build docs
    cp odra.dev.index.html docs/index.html
    cp CNAME docs

serve:
    cd docs && python3 -m http.server

develop:
    cd docusaurus && npm run start

ci-build-and-commit:
    just install
    just build
    git config --local user.email "action@github.com"
    git config --local user.name "GitHub Action"
    git add docs/
    git commit -m "Automatic site build"
    git config --global --add safe.directory /github/workspace