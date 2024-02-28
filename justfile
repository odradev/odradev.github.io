install:
    cd docusaurus && npm install

build:
    just install
    cd docusaurus && npm run build
    rm -rf docs
    cp -r docusaurus/build docs
    cp odra.dev.index.html docs/index.html
    cp *.ttf docs
    cp CNAME docs

serve:
    python3 -m http.server

develop:
    cd docusaurus && npm run start

docs-new-version version:
    cd docusaurus && npm run docusaurus docs:version {{version}}

ci-build-and-commit:
    just build
    git config --local user.email "action@github.com"
    git config --local user.name "GitHub Action"
    git add docs/
    git commit -m "Automatic site build"
    git config --global --add safe.directory /github/workspace

develop-with-search:
    cd docusaurus && npm run build
    cd docusaurus && npm run serve