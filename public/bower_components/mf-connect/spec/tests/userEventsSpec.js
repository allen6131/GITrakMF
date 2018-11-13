describe('events unit tests', function() {

    var mfStubs = require('../../spec/tests/mfStubs');

    var mfConnect;
    var defaultOptions;
    var defaultInvokeHandler = MfConnect.prototype.invokeEventHandler;

    beforeEach(function () {
        $("#medfusion-connect-modal").remove();
        require('../../app-src/js/main');
        require('../../app-src/js/mf-utils');
        mfConnect = new mfStubs.StubMfConnect();

        defaultOptions = {
            url: 'http://d3-pt-aws01.dev.medfusion.net:8081/api-gateway-proxy/services',
            userUuid: '12311',
            customerUuid: '22233',
            accessToken: 'token123'
        };
    });

    afterEach(function() {
        MfConnect.prototype.invokeEventHandler = defaultInvokeHandler;
    });

    it('pass correct onSelectProvider metadata', function () {

        var _metadata;
        MfConnect.prototype.invokeEventHandler = function(event, metadata) {
            _metadata = metadata;
        };
        mfConnect.invokeOnSelectProviderHandler("some_name", [mfStubs.selectedSearchItemOffice]);
        expect(_metadata.id).toEqual("7d0c3327-6ae0-4024-860f-1931041ca0dc");
        expect(_metadata.displayName).toEqual("some_name");
        expect(_metadata.address).toEqual("5501 Dillard Drive, CARY, NC 27518");
    });

    it('pass correct onSelectProvider metadata 2', function () {

        var _metadata;
        MfConnect.prototype.invokeEventHandler = function(event, metadata) {
            _metadata = metadata;
        };
        mfConnect.invokeOnSelectProviderHandler("some_name", [mfStubs.selectedSearchItemPractice]);
        expect(_metadata.id).toEqual("4733eec8-b564-42b7-a038-e9e3992707a4");
        expect(_metadata.displayName).toEqual("some_name");
        expect(_metadata.address).toEqual("4201 Lake Boone Trl, Raleigh, NC 27607");
    });

    it('pass correct onSelectProvider metadata 3', function () {

        var _metadata;
        MfConnect.prototype.invokeEventHandler = function(event, metadata) {
            _metadata = metadata;
        };
        mfConnect.invokeOnSelectProviderHandler("some_name", [mfStubs.selectedSearchItemPracticeProvider]);
        expect(_metadata.id).toEqual("ec3065e5-215a-446d-86d9-40c25949e8bc");
        expect(_metadata.displayName).toEqual("some_name");
        expect(_metadata.address).toEqual("3024 New Bern Ave, Raleigh, NC 27610");
    });

    it('pass correct onSelectPortal metadata 1: location with no portal', function () {

        var _metadata;
        MfConnect.prototype.invokeEventHandler = function(event, metadata) {
            _metadata = metadata;
        };
        mfConnect.invokeOnSelectPortal();
        expect(_metadata.type).toEqual("NO_PORTAL");
        expect(_metadata.message).toEqual("The selected location is not associated to any portals yet.");
    });

    it('pass correct onSelectPortal metadata 2: location with pending portal in dev', function () {

        var mfStubs = require('../../spec/tests/mfStubs');
        var _metadata;
        MfConnect.prototype.invokeEventHandler = function(event, metadata) {
            _metadata = metadata;
        };
        mfConnect.invokeOnSelectPortal(mfStubs.portalPendingInDev);
        expect(_metadata.type).toEqual("PLACEHOLDER_PORTAL");
        expect(_metadata.message).toEqual("The selected location is currently set to a placeholder portal until a formal mapping has been made.");
    });

    it('pass correct onSelectPortal metadata 2: location with pending portal inactive', function () {

        var mfStubs = require('../../spec/tests/mfStubs');
        var _metadata;
        MfConnect.prototype.invokeEventHandler = function(event, metadata) {
            _metadata = metadata;
        };
        mfConnect.invokeOnSelectPortal(mfStubs.portalPendingInActive);
        expect(_metadata.type).toEqual("PLACEHOLDER_PORTAL");
        expect(_metadata.message).toEqual("The selected location is currently set to a placeholder portal until a formal mapping has been made.");
    });

    it('pass correct onSelectPortal metadata 3: location with portal', function () {

        var mfStubs = require('../../spec/tests/mfStubs');
        var _metadata;
        MfConnect.prototype.invokeEventHandler = function(event, metadata) {
            _metadata = metadata;
        };
        mfConnect.invokeOnSelectPortal(mfStubs.portal);
        expect(_metadata.id).toEqual(145);
        expect(_metadata.name).toEqual("Kelsey's Amazing Test Portal");
        expect(_metadata.type).toEqual("TEST_PORTAL");
    });
});

describe('events work', function () {
    // var $a = require('jquery');
    var mfStubs = require('../../spec/tests/mfStubs');

    var mfConnect;
    var defaultOptions;

    var searchForProvider = function () {
        $("#searchBy").val("some place");
        $("#searchZip").val("some zipcode");

        $("#directorySearchBtn").click();
    }

    beforeEach(function () {
        $("#medfusion-connect-modal").remove();
        require('../../app-src/js/main');
        require('../../app-src/js/mf-utils');
        mfConnect = new mfStubs.StubMfConnect();

        defaultOptions = {
            url: 'http://d3-pt-aws01.dev.medfusion.net:8081/api-gateway-proxy/services',
            userUuid: '12311',
            customerUuid: '22233',
            accessToken: 'token123'
        };
    });

    it('onLoad handler', function () {

        var executed = false;
        var meta;
        defaultOptions["onEvent"] = function (eventName, metadata) {
            executed = true;
            meta = metadata;
        };

        mfConnect.launch(defaultOptions);

        expect(executed).toEqual(true);
        expect(meta.target).toBeDefined();
    });

    it('no onLoad handler', function () {

        mfConnect.launch(defaultOptions);
    });

    it('no onExit handler', function () {

        defaultOptions["onEvent"] = function (eventName) {
            if (eventName === "onOpenDialog") {
                mfConnect.close();
            }
        };
        mfConnect.launch(defaultOptions);
    });

    it('onExit handler', function () {

        var executed = false;
        defaultOptions["onEvent"] = function (eventName) {
            if (eventName === "onOpenDialog") {
                mfConnect.close();
            }
            if (eventName === "onCloseDialog") {
                executed = true;
            }
        };
        mfConnect.launch(defaultOptions);
        expect(executed).toEqual(true);
    });

    it('onSearchProvider Event', function () {

        var meta;
        defaultOptions["onEvent"] = function (eventName, metadata) {
            if (eventName === "onSearchProvider") {
                meta = metadata;
            }
        };
        mfConnect.launch(defaultOptions);
        mfConnect._goToSearchForConnection('connectionOverview');

        searchForProvider();

        expect(meta.term).toEqual("some place");
        expect(meta.zipCode).toEqual("some zipcode");
    });

    it('onSelectProvider Event', function () {

        var meta;
        defaultOptions["onEvent"] = function (eventName, metadata) {
            if (eventName === "onSelectProvider") {
                meta = metadata;
            }
        };
        mfConnect.launch(defaultOptions);
        mfConnect._goToSearchForConnection('connectionOverview');

        searchForProvider();

        // select provider
        $("li").click();

        expect(meta.id).toEqual("7a36a769-38eb-42e5-8afc-8e3a99924f02");
        expect(meta.displayName).toEqual("Kelseys Amazing Test Portal");
        expect(meta.address).toEqual("Raleigh, NC 27603");
    });

    it('onSelectLocation Event', function () {

        mfConnect.api.findAllDirectorySearch = function (term, zipCode) {
            return new mfStubs.StubPromise(mfStubs.directoryProviders);
        };

        mfConnect.api.findByDirectoryId = function () {
            return new mfStubs.StubPromise(mfStubs.multiLocationsProvider);
        };

        var meta = null;
        defaultOptions["onEvent"] = function (eventName, metadata) {
            if (eventName === "onSelectLocation") {
                meta = metadata;
            }
        };
        mfConnect.launch(defaultOptions);
        mfConnect._goToSearchForConnection('connectionOverview');

            searchForProvider();

        // select provider
        $("li").click();

        // select location
        $("li")[1].click();

        expect(meta.id).toEqual("fa13a38d-22a5-4370-b724-d055a8ea0626");
        expect(meta.displayName).toEqual("DUKE UNIVERSITY");
        expect(meta.address).toEqual("2301 Erwin Rd, Durham, NC 27705");
    });

    it('onSelectPortal Event', function () {

        mfConnect.api.findAllDirectorySearch = function (term, zipCode) {
            return new mfStubs.StubPromise(mfStubs.directoryProviders);
        };

        mfConnect.api.findByDirectoryId = function (directoryLocationId, directoryLocationType, includeChildren) {
            return new mfStubs.StubPromise([mfStubs.portal, mfStubs.portal]);
        };

        var meta = null;
        defaultOptions["onEvent"] = function (eventName, metadata) {
            if (eventName === "onSelectPortal") {
                meta = metadata;
            }
        };
        mfConnect.launch(defaultOptions);
        mfConnect._goToSearchForConnection('connectionOverview');

        searchForProvider();

        // select provider
        $("li").click();

        // select location
        $("li")[1].click();

        // select location
        $("li")[0].click();

        expect(meta.id).toEqual(145);
        expect(meta.name).toEqual("Kelsey's Amazing Test Portal");
        expect(meta.type).toEqual("TEST_PORTAL");
    });

    it('onConnectProvider Event', function () {

        var executed = false;
        var meta;
        defaultOptions["onEvent"] = function (eventName, metadata) {
            if (eventName === "onConnectProvider") {
                executed = true;
                meta = metadata;
            }
        };
        mfConnect.launch(defaultOptions);
        mfConnect._goToSearchForConnection('connectionOverview');

        searchForProvider();


        // select provider
        $("li").click();

        $("#connectionCredentials_username").val("user");
        $("#connectionCredentials_password").val("password");
        $("#createConnectionBtn").click();

        expect(executed).toEqual(true);
        expect(meta.connection).toBeDefined();
    });

    it('onError handler', function () {

        mfConnect.api.findAllDirectorySearch = function (term, zipCode) {
            return new mfStubs.StubErrorPromise();
        };

        var meta;
        defaultOptions["onEvent"] = function (eventName, metadata) {
            if (eventName === "onError") {
                meta = metadata;
            }
        };

        mfConnect.launch(defaultOptions);

        // search
        mfConnect._goToSearchForConnection('connectionOverview');

    searchForProvider();

        expect(meta.error).toEqual("Error getting directory search results.");
    });
});
