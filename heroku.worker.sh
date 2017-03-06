#!/bin/bash

git checkout -b "dist"

echo Overwrite .gitignore
cp .gitignore_dist .gitignore

echo Build assets
yarn build:server

echo Commit assets
git add -A
git commit -m "Heroku Build"

echo push to Heroku
#git push web dist:master --force
git push worker dist:master --force


git checkout master

git branch -D "dist"
