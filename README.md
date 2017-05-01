# Salesforce Tools

## What

This application allows you to:

- make seamless deployment between 2 Salesforce organizations (Sandbox to Production, Production to Production, etc.) in a user friendly UI. You can also create your own Change Sets that you can reuse later, likewise in Salesforce.

- backup your metadata in real time (approx. 10 min schedule) into a Git repository of your choice (GitHub and Bitbucket are supported but it's easily extendable to any Git Server, including your own/company one).

- validate the unit tests of your Org and get a report mailed to you or posted in a Slack Channel.

- manage your project in a similar way to [Stratosource](https://github.com/StratoSource/StratoSource/wiki/Screenshots). This application is inspired by Strato around the detection of changed/new/deleted Metadata but is more advanced in many respects to it. It's especially very performant and is relatively smart when it comes to the analysis and parsing of complex metadata (objects, profiles, permission sets ...). In short, the application fetches metadata from Git, parses them, split the complex ones into many chunks and save them in a Mongo DB. From there, you can assign each of them to a Story and build a deployment package (based on 1 or multiple Stories). Also you will be able to track changes over time and update (or not) each package.

## How does it work?

This is a user friendly browser application working best on modern browsers.

## On what is it built?

The application is based on Koa2, Angular, Mongo, Redis... The application is easy to deploy on Heroku. An attempt has been done with Docker, and even so it worked there is no support. Potentially it can be deployed to any application server.

## Can I test it?

Yes, it's available under https://sftools.herokuapp.com. Please note, that while you should be able to deploy easily across environment, the backup of metadata on Git is more resource consuming and especially, the project management part is generating very large volume of data which is not going to work on a free mongo tier... Please be mindful! Also note that while the app does not store any credentials, it will store your access and especially your [refresh token](https://help.salesforce.com/apex/HTViewHelpDoc?id=remoteaccess_oauth_refresh_token_flow.htm&language=en). Therefore, you shouldn't use any of these free app with any Production credentials. Instead, you should clone the repository and install the app on your own instance.

## How much does it cost?

Nothing, this is a personal project. You have full access to the source code.

## Table of Contents

1. [Tutorial](#tutorial)
    1. [Backup on GitHub or Bitbucket](#1-backup-on-github-or-bitbucket)
        1. [Getting Started](#getting-started)
        1. [Private Keys tab](#private-keys-tab)
        1. [Git Servers tab](#git-servers-tab)
        1. [Connections tab](#connections-tab)
        1. [If everything is fine](#if-everything-is-fine)
        1. [Most relevant reasons why it may fail](#most-relevant-reasons-why-it-may-fail)
    1. [Deployment](#2-deployment)
        1. [Deployment Prerequisite](#deployment-prerequisite)
        1. [Deployment tab](#deployment-tab)
            1. [Story or Release](#story-or-release)
            1. [Real time components from an Org](#real-time-components-from-an-org)
            1. [Change Sets](#change-sets)
            1. [Generate a package.xml or get a zip](#generate-a-packagexml-or-get-a-zip)
    1. [Unit Tests](#3-unit-tests)
        1. [Unit Tests Prerequisite](#unit-tests-prerequisite)
        1. [Getting Started](#getting-started)
    1. [Projects](#4-projects)
        1. [Project Prerequisite](#project-prerequisite)
        1. [Getting started - Projects tab](#getting-started---projects-tab)
        1. [Releases and Stories tab](#releases-and-stories-tab)
        1. [Passive update](#passive-update)
        1. [Validation tab](#validation-tab)
        1. [Deleted metadata](#deleted-metadata)
        1. [Most relevant reasons why you may not see anything in your project, even after 10 minutes](#most-relevant-reasons-why-you-may-not-see-anything-in-your-project-even-after-10-minutes)
1. [Deployment on your own server](#deployment-on-your-own-server)
1. [How can I contribute?](#how-can-i-contribute)


# Tutorial

##	1-Backup on GitHub or Bitbucket

### Getting Started

1. Create your user on the login page (https://sftools.herokuapp.com)

2. Log in with your new username / password.

### Private Keys tab

Sign up for a Bitbucket or GitHub Account if you haven't any. Once done, you have to upload/save your private key in the App and your public key in Bitbucket/GitHub. If you don’t remember how to create that, go in a terminal and execute "ssh-keygen". Don’t give a password when asked (i.e. let blank and click enter) otherwise the App will not be able to communicate with the Git server. Once done, add the key and give a name (it will be used later when adding a new connection). A **valid** private key should start with `-----BEGIN RSA PRIVATE KEY-----` and ends with `-----END RSA PRIVATE KEY-----`. Do **not** remove this _header_ and this _footer_, they are part of the private key, simply copy/paste the entire file!

### Git Servers tab

You have to choose your server (either Bitbucket or GitHub – or both if you want to use both) and enter your credentials in the respecting server field. You may not give your password but the Heroku App will be unable to create the repository. If you don't enter your password, you must instead create manually your repository in Bitbucket/Github. The Git push requires indeed just your private key and your Git username. Special care about your Git username, it's case sensitive! Only your Git username is valid as username (i.e. not your Git Email Address).

### Connections tab

You can now add a new connection, choose one of the private key you previously entered and choose your Git server (the app will assume that you entered credentials for the selected Git server). The name you entered in the folder input field is used to match your application on Git. If you didn’t enter your Git password, you have to use the same name on your Git account for the repository name.
![Connection Creation](/screenshots/Connection_Creation.png)

### If everything is fine

You should see (within 10 minutes) the repository created in your Git Account. It runs in the background and commit on Git any change which can occur in selected metadata.

Note that a click on the link of a created connection will log you automatically in the corresponding org even if you were not logged in before.

### Main reasons why it may fail

* You gave a wrong git username / password (or you didn’t respect the case of your password and/or username).

* You may use your email address as username in Git but you need to give your real username in the App, the email address won’t work. Your username can be found directly in the url once logged in: e.g. https://bitbucket.org/XyZ => username is `XyZ`.

* You created your Git Account a long time ago and your username contains some not supported characters (your username should only contain letters, numbers or underscores).

* You mixed private key and public key, read again point 3.

* Your private key is encrypted (i.e. has a password) ==> create a new one without password.

* You really have to copy paste one for one your private key. Don’t consider any character of the private key file as a comment (see point 3).

* The public key corresponding to your private key is not loaded in your Git account.

* You have not the right profile on Salesforce to retrieve the metadata (note that you should at least see an empty repository in the git server). You should be a System Administrator, or equivalent.


## 2-Deployment

### Deployment Prerequisite

You need to create connections on the connections tab (like for the point 1.).

### Deployment tab

You can cancel a deployment which has started to Salesforce. A cancellation may take some time and whether it succeeds depends on Salesforce (the cancellation is a simple API call) and how fast you were to cancel the deployment.

#### Story or Release

You can deploy a Story or a Release. Selecting a story or release will hide irrelevant options. If you don't select any metadata, the whole story/release will be deployed. You may however select metadata and only these metadata will be deployed.

#### Real time components from an Org

You can choose your source, your target and then select metadata to deploy. This will pull the live metadata directly from the source and deploy them to the target. You can also remove directly metadata by clicking the checkbox `Click to delete metadata`.

Check only, rollback on error and test level options are the same than for the Ant migration tools. Also if you deploy to a live org, some of the options are ignored by Salesforce (like the test level).

Note that if the token of your connection to Salesforce is not valid anymore, the connection will not be available for selection.

#### Generate a package.xml or get a zip

When you select a source (and few metadata), you can click on `Download package.xml` or `Download ZIP` to get just the package.xml or the full zip of the selected metadata.
![Deployment Panel1](/screenshots/Deployment_Panel1.png)
![Deployment Panel2](/screenshots/Deployment_Panel2.png)
![Deployment Panel3](/screenshots/Deployment_Panel3.png)

## 3-Unit Tests

### Unit Tests Prerequisite

You need a connection setup

### Getting started

When editing a connection, you have the possibility to select whether unit tests will be executed against the org. You can specify a range (start / end daily hours), choose whether your tests should be executed through the Synchronous or Asynchronous API and enter your email. Note that some mail server may just reject the email (without even notifying you). A Gmail address will definitely work.

The application can mail you the results or post them into a Slack Channel. If your company is already using Slack, you can simply get a Webhook URL by following the instructions here https://my.slack.com/services/new/incoming-webhook/ and save it in the Connection.

Warnings:

* Async Testing is usually preferred, but unfortunately it will quickly run against some limits of the Salesforce platform (https://developer.salesforce.com/docs/atlas.en-us.apexcode.meta/apexcode/apex_testing_unit_tests_running.htm). Thus it's recommended to not check this option.

* Synchronous Testing may lock the Organization, blocking developers from saving their classes. Thus you shall not run the tests with a frequency too high (not below hourly).

## 4-Projects

### Projects Prerequisite

You may not have an active backup setup (point 1.) for using projects, and if you don't, you will have to push your Salesforce changes manually into Git, matching the name of your connection. If you have an active backup connection, your changes will be reflected almost in real time in Git, which is the recommended approach.

### Getting started - Projects tab

You can create a new project on the project tab, select a name and a connection. The connection name will be used for pulling from Git stored metadata. While the connection may not be setup to backup automatically the metadata, it's obviously important that the connection has a correct private key / Git server associated so that the app may communicate with Git. The metadata (coming from Git) will be analyzed, parsed and stored into a database. Once you have created a project, you should see after a few minutes (within the project) the changes represented as a tree. Depending on the size of your organization, you may see up to a few hundred thousands of records. The recommended approach is to ignore all the metadata (it's a one time operation), and every time a change happens, it will show up in the view (without the unchanged metadata).
![Projects](/screenshots/Projects.png)
![Project sharing](/screenshots/Project_sharing.png)

### Releases and Stories tab

Beside projects, you can create stories and releases (a release is composed of 1 or more stories). Once you have created at least 1 story, you can associate it to metadata of a project. You can bulk assign story/stories to a list of metadata through the different button on the project page. You can bulk remove stories, or click on the "x" of each story metadata to remove them one at a time.

Once you have added metadata to a story, you can go directly on a story, remove metadata and download all the metadata associated to the story.

A release is an aggregation of stories and you can do something similar on a release: you can download all the metadata of the associated stories. If some stories have the same metadata (conflict), you have the possibility to choose whether the latest metadata will overwrite the others, or the other way around (functionality only available for releases).
![Project detail](/screenshots/Project_detail.png)

### Passive update

Please note that once a metadata is associated to a story, the story-metadata is not automatically updated (if a new version of the metadata is available). However, you will see that the tag turns from green to orange, and you have the possibility to click on it to see the differences (kind of `git diff`). You can either ignore the change or update the metadata to its latest version. You have always the possibility to remove at any time a story-metadata from a story. However please note that once you remove a story-metadata, this step cannot be reverted. This is especially relevant for metadata which have an older version.
![Project detail2](/screenshots/Project_detail2.png)
![Project detail field updated](/screenshots/Project_detail_field_updated.png)
![Project detail field updated2](/screenshots/Project_detail_field_updated2.png)
![Project story detail field updated](/screenshots/Project_story_detail_field_updated.png)

### Validation tab

You can validate stories or releases against an organization. You may choose to receive an email and you can also specify the level of unit tests. On the validation view, you can view the latest outcome and see the last time it has been validated.
![Project Validations](/screenshots/Projects_Validations.png)

### Deleted metadata

Deleted metadata (from Salesforce) will be displayed (in a red text color) and can be associated to a story or to a release. Once you generate a package or execute a deployment, they will be part of the `destructiveChanges.xml` package. Please keep in mind that the tracking of deleted metadata starts first when a project associated to a connection has been created. The app is not aware of anything which has happened before.

### Most relevant reasons why you may not see anything in your project, even after 10 minutes

* The connection has not an active backup setup **or** the repository in Git is empty (i.e. you didn't populate the repository manually)

* the name of the connection does not correspond to any repository in Git (if you are using special characters, the slug version of the string is considered for matching)

* No (or invalid) private key associated to your connection

* No (or invalid) Git server associated to your connection

# Deployment on your own server

Before trying to deploy on your own server, you will want to experiment on your local machine first. In order to get the application running, you will have to setup a few things first:

- Install globally `npm`, `yarn` and `nodemon`.

- Install dependencies with `yarn install`.

- Copy `/src/server/config/env/production.js` and rename it to `/src/server/config/env/development.js`. Edit each key:
  - session: random string
  - token: random string
  - database: MongoDB URL (e.g. `mongodb://heroku_xxxxxx:xxxxxx@xxxx.mlab.com:11382/heroku_xxxx`)
  - redis: Redis URL (e.g. `redis://xxxx:xxxx@pub-redis-xxxx.us-east-xxxxx.garantiadata.com:xxxx`)
  - redirect_uri: could be `http://localhost:4200/api/Connection/callback` for the localhost
  - clientId / clientSecret: coming from the connected App in Salesforce (ensure the redirect_uri is setup correctly too in the connected App)
  - sendgrid_apikey: you need to sign up for an account (free)

After you are done with the steps above, you need to run 3 processes in 3 different terminals:
- `yarn watch:client:hmr` runs anytime a change happens on the front end code
- `yarn watch:server` runs anytime a change happens on the back end code
- `yarn start` runs the node server (for backend code)

In development mode, you will go on http://localhost:4200

# How can I contribute?

Your contribution is very much welcome!

To get started, please read the [previous section](#deployment-on-your-own-server).

The code is located in `src`, split between `client` and `server`

The server side code is split into essentially 2 parts (have a look at the `Procfile`). The `web` part is responsible for managing the whole UI, and also manages things like deployment and generally about any interaction which has to happen with the front end. The `worker` part is essentially located within `/server/src/background-services`