var _ = require('lodash');
var Promise = require('bluebird');

var mfConnectService = (function () {
    'use strict';

    // *** these are here for reference and will be taken out before we go out with mfConnect
    //var apiDevUrl = 'http://d3-pt-aws01.dev.medfusion.net:8081/api-gateway-proxy/services';
    //var apiSandboxUrl = 'https://apisandbox.medfusion.net';

    var mfConnectData = {};
    var apiUrl = '';

    return {

        getMfConnectData: function () {
            return mfConnectData;
        },

        /*
         *  set mfConnectData
         *  options will include userUuid, customerUuid, accessToken, and url for env
         *  it will also include apiKey if demo or prod env
         */
        setMfConnectData: function (options) {

            mfConnectData = options;
            apiUrl = options.url;

            return mfConnectService.findAllProfiles()
                .then(function (profiles) {
                    _.forEach(profiles, function (profile) {
                        if (profile.isSelf) {
                            mfConnectData.profileId = profile.id;
                        }
                    });
                    return mfConnectData;
                }, function (error) {
                    return error;
                });
            // error handling?
        },

        // if token expires, reset token
        setAccessToken: function (token) {
            mfConnectData.accessToken = token;
        },

        // probably won't need these, well set profileId in beginning and it'll be on the data object throughout but eh
        getProfileId: function () {
            return mfConnectData.profileId;
        },

        setProfileId: function (profileId) {
            mfConnectData.profileId = profileId;
        },

        // profiles endpoints
        /*
         *  Returns an array of all profiles connected to the userUuid
         */
        findAllProfiles: function () {
            var url = apiUrl + '/v1/customers/' + mfConnectData.customerUuid + '/users/' + mfConnectData.userUuid + '/profiles';
            return mfConnectService.generatePromiseRequest('GET', url);
        },

        /*
         *  Returns a single profile for the given profileId
         */
        findProfileById: function (profileId) {
            var url = apiUrl + '/v1/customers/' + mfConnectData.customerUuid + '/users/' + mfConnectData.userUuid + '/profiles/' + profileId;
            return mfConnectService.generatePromiseRequest('GET', url);
        },

        // connections endpoint
        /*
         *  Returns an array of all connections associated with the userUuid
         */
        findAllConnections: function () {
            var url = apiUrl + '/v1/customers/' + mfConnectData.customerUuid + '/users/' + mfConnectData.userUuid + '/connections';
            return mfConnectService.generatePromiseRequest('GET', url);
        },

        /*
         *  Returns a detailed connection object associated with the connectionId
         */
        findConnectionById: function (connectionId, profileId) {
            var url = apiUrl + '/v2/customers/' + mfConnectData.customerUuid + '/users/' + mfConnectData.userUuid + '/profiles/' + profileId + '/connections/' + connectionId;
            return mfConnectService.generatePromiseRequest('GET', url);
        },

        /*
         *  update connection with new connectionData
         */
        // also need hardRefresh param
        updateConnection: function (profileId, connectionData, refresh) {
            var url = apiUrl + '/v2/customers/' + mfConnectData.customerUuid + '/users/' + mfConnectData.userUuid + '/profiles/' + profileId + '/connections/' + connectionData.id;
            if (refresh) {
                url += '?refresh=' + refresh;
            }
            return mfConnectService.generatePromiseRequest('PUT', url, connectionData);
        },

        /*
         *  returns list of connections for specific profileId
         */
        findConnectionsForProfile: function (profileId) {
            var url = apiUrl + '/v2/customers/' + mfConnectData.customerUuid + '/users/' + mfConnectData.userUuid + '/profiles/' + profileId + '/connections';
            return mfConnectService.generatePromiseRequest('GET', url);
        },

        /*
         *  create a new connection for profile
         */
        createConnectionForProfile: function (profileId, portalId, locationId, locationType, providerNameAlias, credentialInfo) {
            var url = apiUrl + '/v2/customers/' + mfConnectData.customerUuid + '/users/' + mfConnectData.userUuid + '/profiles/' + profileId + '/connections?providerNameAlias=' + providerNameAlias;
            if (portalId) {
                url += '&portalId=' + portalId;
            }
            if (locationId) {
                url += '&locationId=' + locationId;
            }
            if (locationType) {
                url += '&locationType=' + locationType;
            }
            return mfConnectService.generatePromiseRequest('POST', url, credentialInfo);
        },

        findConnectionByProfileIdAndConnectionId: function (profileId, connectionId) {
            var url = apiUrl + '/v1/customers/' + mfConnectData.customerUuid + '/users/' + mfConnectData.userUuid + '/profiles/' + profileId + '/connections/' + connectionId;
            return mfConnectService.generatePromiseRequest('GET', url);
        },

        // provider endpoints
        updateProviderConnectionInfo: function (connectionId, providerAliasInfo) {
            var url = apiUrl + '/v1/customers/' + mfConnectData.customerUuid + '/users/' + mfConnectData.userUuid + '/connections/' + connectionId + '/providers/' + providerAliasInfo.providerId;
            return mfConnectService.generatePromiseRequest('PUT', url, providerAliasInfo);
        },

        deleteConnection: function (profileId, connectionId) {
            var url = apiUrl + '/v2/customers/' + mfConnectData.customerUuid + '/users/' + mfConnectData.userUuid + '/profiles/' + profileId + '/connections/' + connectionId;
            return mfConnectService.generatePromiseRequest('DELETE', url);
        },

        /*
         * Search for all directory locations based on the search parameters
         * GET /search
         * maybe pass these in customerUuid, userUuid, apiKey, accessToken
         */
        findAllDirectorySearch: function (searchParams) {
            var url = apiUrl + '/v2/customers/' + mfConnectData.customerUuid + '/users/' + mfConnectData.userUuid + '/search?searchQuery=' + searchParams.searchQuery + '&zip=' + searchParams.zip;
            return mfConnectService.generatePromiseRequest('GET', url);
        },

        /*
         * Fetch office information by officeId
         * GET /offices/{officeId}
         */
        fetchOfficeById: function (officeId, includeProviders) {
            var url = apiUrl + '/v1/customers/' + mfConnectData.customerUuid + '/users/' + mfConnectData.userUuid + '/offices/' + officeId;
            if (includeProviders) {
                url += '?includeProviders=' + includeProviders;
            }
            return mfConnectService.generateRequest('GET', url);
        },

        /*
         * Fetch facility information by facilityId
         * GET /facilities/{facilityId}
         */
        fetchFacilityById: function (facilityId, includeOffices, includeProviders) {
            var url = apiUrl + '/v1/customers/' + mfConnectData.customerUuid + '/users/' + mfConnectData.userUuid + '/facilities/' + facilityId; // + '&includeOffices=false' (defaults true)
            if (includeProviders) {
                url += '?includeProviders=' + includeProviders;
                if (includeOffices) {
                    url += '&includeOffices=' + includeOffices;
                }
            }
            if (includeOffices && !includeProviders) {
                url += '?includeOffices=' + includeOffices;
            }
            return mfConnectService.generateRequest('GET', url);
        },

        // portal service
        /*
         *  Fetch one portal by Id
         */
        findPortalById: function (portalId) {
            var url = apiUrl + '/v1/customers/' + mfConnectData.customerUuid + '/users/' + mfConnectData.userUuid + '/portals/' + portalId;
            return mfConnectService.generatePromiseRequest('GET', url);
        },

        /*
         * fetch portals by url
         */
        fetchPortalsByUrl: function (primaryUrl) {
            var url = apiUrl + '/v2/customers/' + mfConnectData.customerUuid + '/users/' + mfConnectData.userUuid + '/portals/search?primaryUrl=' + encodeURIComponent(primaryUrl);
            return mfConnectService.generatePromiseRequest('GET', url);
        },

        /*
         * Fetch portals by directory id and directory type
         * GET /portals?directoryLocationId= &directoryLocationType=
         */
        findPortalsByDirectoryId: function (directoryLocationId, directoryLocationType, includeChildren) {
            var url = apiUrl + '/v1/customers/' + mfConnectData.customerUuid + '/users/' + mfConnectData.userUuid + '/portals';
            if (directoryLocationId && directoryLocationType) {
                url += '?directoryLocationId=' + directoryLocationId + '&directoryLocationType=' + directoryLocationType;
                if (includeChildren) {
                    url += '&includeChildren=' + includeChildren;
                }
            }
            // possible?
            if (includeChildren && !directoryLocationId && !directoryLocationType) {
                url += '?includeChildren=' + includeChildren;
            }
            return mfConnectService.generatePromiseRequest('GET', url);
        },

        // livedoc
        getLiveDocResources: function (profileId, resourceType) {
            var url = apiUrl + '/v1/customers/' + mfConnectData.customerUuid + '/users/' + mfConnectData.userUuid + '/profiles/' + profileId + '/resources';
            if (resourceType) {
                url += '?resourceType=' + resourceType;
            }
            return mfConnectService.generatePromiseRequest('GET', url);
        },

        getLiveDocResourcesById: function (profileId, liveDocItemId) {
            var url = apiUrl + '/v1/customers/' + mfConnectData.customerUuid + '/users/' + mfConnectData.userUuid + '/profiles/' + profileId + '/resources/' + liveDocItemId;
            return mfConnectService.generatePromiseRequest('GET', url);
        },

        getLiveDocSummaries: function (profileId, resourceType) {
            var url = apiUrl + '/v1/customers/' + mfConnectData.customerUuid + '/users/' + mfConnectData.userUuid + '/profiles/' + profileId + '/resources/summaries';
            if (resourceType) {
                url += '?resourceType=' + resourceType;
            }
            return mfConnectService.generatePromiseRequest('GET', url);
        },

        generateRequest: function (method, url) {
            var token = 'bearer ' + mfConnectData.accessToken;
            var request = new XMLHttpRequest();
            request.open(method, url, false);
            if (mfConnectData.apiKey) {
                request.setRequestHeader('x-api-key', mfConnectData.apiKey);
            }
            request.setRequestHeader('Authorization', token);
            request.send();

            if (request.status === 200) {
                if (request.responseText) {
                    return JSON.parse(request.responseText);
                } else {
                    return request;
                }
            } else {
                return request;
            }
        },

        // generate a promise request based on parameters passed in
        generatePromiseRequest: function (method, url, requestBody) {
            return new Promise(function (resolve, reject) {

                var token = 'bearer ' + mfConnectData.accessToken;

                var request = new XMLHttpRequest();
                request.open(method, url);
                // request went through, either returns response or error
                request.onload = function () {
                    // covers 200 and 204 no content, any others?
                    if (this.status >= 200 && this.status < 300) {
                        if (request.responseText !== '') {
                            resolve(JSON.parse(request.responseText));
                        } else {
                            // need to do something different here
                            resolve(request);
                        }
                    } else {
                        reject(JSON.parse(request.responseText));
                    }
                };
                // request did not go through
                request.onerror = function () {
                    reject({
                        status: this.status,
                        message: 'An unknown error occurred.'
                    });
                };
                if (mfConnectData.apiKey) {
                    request.setRequestHeader('x-api-key', mfConnectData.apiKey);
                }
                request.setRequestHeader('Authorization', token);
                if (requestBody) {
                    request.setRequestHeader('Content-Type', 'application/json');
                    request.send(JSON.stringify(requestBody));
                } else {
                    request.send();
                }
            });
        }
    };

})();

module.exports = mfConnectService;