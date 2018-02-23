/*
 * Copyright (c) 2008-2018, Hazelcast, Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var chai = require('chai');
chai.use(require('chai-as-promised'));
var expect = require('chai').expect;
var RC = require('../RC');
var Client = require('../../').Client;
var Errors = require('../..').HazelcastErrors;
var fs = require('fs');
var path = require('path');

describe('PNCounterConsistencyTest', function () {

    var cluster;
    var member1;
    var client;

    beforeEach(function () {
        this.timeout(10000);
        return RC.createCluster(null, fs.readFileSync(path.resolve(__dirname, 'hazelcast_crdtreplication_delayed.xml'), 'utf8')).then(function (cl) {
            cluster = cl;
            return RC.startMember(cluster.id);
        }).then(function (value) {
            member1 = value;
            return RC.startMember(cluster.id);
        }).then(function (value) {
            return Client.newHazelcastClient();
        }).then(function (value) {
            client = value;
        });
    });

    afterEach(function () {
        this.timeout(10000);
        client.shutdown();
        return RC.shutdownCluster(cluster.id);
    });

    it('target replica killed, no replica is sufficiently up-to-date, get operation throws ConsistencyLostError', function () {
        var pncounter = client.getPNCounter('pncounter');
        return pncounter.getAndAdd(3).then(function () {
            return RC.terminateMember(cluster.id, member1.uuid);
        }).then(function () {
            return expect(pncounter.addAndGet(10)).to.be.rejectedWith(Errors.ConsistencyLostError);
        });
    });

    it('target replica killed, no replica is sufficiently up-to-date, get operation may proceed after calling reset', function () {
        var pncounter = client.getPNCounter('pncounter');
        return pncounter.getAndAdd(3).then(function () {
            return RC.terminateMember(cluster.id, member1.uuid);
        }).then(function () {
            return pncounter.reset();
        }).then(function () {
            return pncounter.addAndGet(10);
        });
    })
});