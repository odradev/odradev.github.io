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
