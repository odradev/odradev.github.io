build:
    bundle exec jekyll build -d docs

develop-serve:
    cd docs && python3 -m http.server