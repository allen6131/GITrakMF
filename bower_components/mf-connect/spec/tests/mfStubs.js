var MfStubs = {};

MfStubs.StubPromise = function (result) {
    this.then = function (successFunc, errorFunc) {
        return new MfStubs.StubPromise(successFunc(result));
    };
};

MfStubs.StubErrorPromise = function () {
    this.then = function (successFunc, errorFunc) {
        return new MfStubs.StubErrorPromise(errorFunc());
    };
};

MfStubs.multiLocationsProvider = require('./data/multiLocationsProvider.json');

MfStubs.directoryProviders = require('./data/providers.json');

MfStubs.connection = require('./data/connection.json');

MfStubs.provider = require('./data/provider.json');

MfStubs.portal = require('./data/portal.json');

MfStubs.portalPendingInDev = require('./data/pending-portal-in-dev.json');

MfStubs.portalPendingInActive = require('./data/pending-portal-inactive.json');

MfStubs.office = require('./data/office.json');

MfStubs.profile = require('./data/profile.json');

MfStubs.selectedSearchItemOffice = require('./data/search-results/search-item-office.json');

MfStubs.selectedSearchItemPractice = require('./data/search-results/search-item-practice.json');

MfStubs.selectedSearchItemPracticeProvider = require('./data/search-results/search-item-practice-provider.json');

MfStubs.StubMfConnect = function () {

    var mfConnect = new MfConnect();
    mfConnect.api.findAllProfiles = function () {
        return new MfStubs.StubPromise(MfStubs.profile);
    };
    mfConnect.api.findConnectionsForProfile = function () {
        return new MfStubs.StubPromise([]);
    };
    mfConnect.api.findAllDirectorySearch = function (term, zipCode) {
        return new MfStubs.StubPromise([MfStubs.provider]);
    };
    mfConnect.api.findPortalsByDirectoryId = function (directoryLocationId, directoryLocationType, includeChildren) {
        return new MfStubs.StubPromise([MfStubs.portal]);
    };
    mfConnect.api.findConnectionsForProfile = function () {
        return new MfStubs.StubPromise([]);
    };
    mfConnect.api.fetchOfficeById = function () {
        return MfStubs.office;
    };
    mfConnect.api.createConnectionForProfile = function () {
        return new MfStubs.StubPromise(MfStubs.connection);
    };
    mfConnect.api.fetchProviderById = function () {
        return new MfStubs.StubPromise(MfStubs.multiLocationsProvider);
    };
    return mfConnect;
};

module.exports = MfStubs;
