# M.E.A.N. Uploader (server)

![alt text](https://github.com/goughjt/meanUploader_client/blob/master/app/images/413_small.png "The terror")

### About
The server half of an unstable testing ground for uploading files in the M.E.A.N stack

### Requirements
If you want to run this server, you will need to have 3 things installed:

1. [npm](https://www.npmjs.com/)
1. [Redis](https://redis.io/topics/quickstart)
1. [Mongodb](https://docs.mongodb.com/manual/installation/)

I installed these things using [Homebrew](https://brew.sh/)

```shell
$ brew install node redis mongodb
```

### Running the server

Before running the server, make sure mongodb and redis are running. I run these from the mac terminal using:


```shell
$ mongod
$ redis-server
```
You will probably want to run these in their own terminal windows.

Once you have redis and mongodb running then all you have to do is the usual:

```shell
$ npm install
$ npm start
```
 from within this directory.
