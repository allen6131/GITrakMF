var mfConnect = require('../js/mf-connect-service.js');
var _ = require('lodash');
var Promise = require('bluebird');

var mfUtils = (function () {
    'use strict';

    return {

        // returns display name for places in search results list
        getPracticeDisplayName: function (practice) {
            return _.startCase(practice.displayName);
        },

        // returns display address for places in search results list
        getPracticeDisplayAddress: function (practice) {
            return practice.fullAddress;
        },

        // returns provider display name in search results list
        getProviderDisplayName: function (provider) {
            return _.startCase(provider.providerName);
        },

        // returns provider display address in search results list
        getProviderDisplayAddress: function (provider) {
            return provider.fullAddress;
        },

        getDirectoryLocationDisplayName: function (directoryLocation) {
            var name = '';
            if (directoryLocation.practiceName && directoryLocation.displayName) {
                if (_.toLower(directoryLocation.practiceName) === _.toLower(directoryLocation.displayName)) {
                    name = _.startCase(directoryLocation.displayName);
                } else {
                    name = _.startCase(directoryLocation.practiceName) + ': ' + _.startCase(directoryLocation.displayName);
                }
            } else if (directoryLocation.practiceName) {
                name = directoryLocation.practiceName;
            } else if (directoryLocation.displayName) {
                name = directoryLocation.displayName;
            }
            return name;
        },

        getAddressDisplayName: function (selectedItem) {
            return selectedItem.fullAddress;
        },

        /*
         *  returns results from search separated into providers and practices
         */
        findDirectoryLocations: function (searchTerm, zipCode) {

            searchTerm = _.trim(searchTerm);
            if (_.startsWith(_.toLower(searchTerm), 'dr.') || _.startsWith(_.toLower(searchTerm), 'dr ')) {
                searchTerm = searchTerm.slice(3);
            }
            var searchParams = {
                searchQuery: searchTerm,
                zip: zipCode,
                limit: 100
            };

            return mfConnect.findAllDirectorySearch(searchParams)
                .then(function (directoryResults) {
                    // filter out result list
                    var resultList = {
                        providers: [],
                        practices: []
                    };

                    var providers = _.filter(directoryResults, function (directoryResult) {
                        return !!directoryResult.providerId;
                    });

                    var practices = _.filter(directoryResults, function (directoryResult) {
                        return !directoryResult.providerId;
                    });

                    resultList.practices = _.uniqBy(practices, 'practiceId');
                    resultList.providers = _.uniqBy(providers, 'providerId');

                    return resultList;
                }, function (error) {
                    return Promise.reject(error);
                });
        },

        getPortalsNextStep: function (params, portalArray) {
            if (portalArray.length === 0) {
                params.nextStep = 'createConnectionEnterCredentials';
                return params;
            } else if (portalArray.length === 1) {
                params.nextStep = 'createConnectionEnterCredentials';
                params.portal = portalArray[0];
                return params;
            } else {
                params.nextStep = 'createConnectionSelectPortal';
                params.portalArray = portalArray;
                return params;
            }
        },

        selectOfficeDirectoryItem: function (directoryObjectArray) {

            var params = {
                directoryLocation: {},
                nextStep: '',
                directoryInstance: {}
            };
            var errorHandler = function (error) {
                return Promise.reject(error);
            };
            var _this = this;
            var portalNextStep = function (portalArray) {
                return _this.getPortalsNextStep(params, portalArray);
            };
            params.directoryLocation.directoryLocationId = directoryObjectArray.officeId;
            params.directoryLocation.directoryLocationType = 'OFFICE';
            return mfConnect.findPortalsByDirectoryId(directoryObjectArray.officeId, 'OFFICE').then(portalNextStep, errorHandler);
        },

        selectFacilityDirectoryItem: function (directoryObjectArray) {

            var params = {
                directoryLocation: {},
                nextStep: '',
                directoryInstance: {}
            };
            var errorHandler = function (error) {
                return Promise.reject(error);
            };
            var _this = this;
            var portalNextStep = function (portalArray) {
                return _this.getPortalsNextStep(params, portalArray);
            };
            params.directoryLocation.directoryLocationId = directoryObjectArray.facilityId;
            params.directoryLocation.directoryLocationType = 'FACILITY';
            return mfConnect.findPortalsByDirectoryId(directoryObjectArray.facilityId, 'FACILITY').then(portalNextStep, errorHandler);
        },

        /*
         * returns an object with the name of the next step, directoryLocation, and possibly directoryInstance or portal or portalArray
         */
        selectDirectoryObject: function (directoryObjectArray) {
            if (directoryObjectArray.officeId) {
                return this.selectOfficeDirectoryItem(directoryObjectArray);
            }
            if (directoryObjectArray.facilityId) {
                return this.selectFacilityDirectoryItem(directoryObjectArray);
            }
        },

        /*
         *  check if location has multiple portals and returns params object with information for next step
         */
        checkForMultiplePortals: function (location, parameters) {

            var params = parameters;
            params.nextStep = '';

            params.directoryLocation.directoryLocationId = location.locationInfo.sourceId;
            params.directoryLocation.directoryLocationType = location.locationType;

            var errorHandler = function (error) {
                return Promise.reject(error);
            };

            var _this = this;
            var portalNextStep = function (portalArray) {
                return _this.getPortalsNextStep(params, portalArray);
            };

            return mfConnect.findPortalsByDirectoryId(location.locationInfo.sourceId, location.locationType).then(portalNextStep, errorHandler);
        },

        fetchDirectoryLocation: function (directoryLocation) {
            if (directoryLocation.directoryLocationType === 'OFFICE') {
                return mfConnect.fetchOfficeById(directoryLocation.directoryLocationId);
            } else if (directoryLocation.directoryLocationType === 'FACILITY') {
                return mfConnect.fetchFacilityById(directoryLocation.directoryLocationId);
            }
            return null;
        },

        /*
         *  params = {
         *      directoryLocation: {
         *          directoryLocationId
         *          directoryLocationType
         *          directoryLocationName (maybe)
         *          searchSelectionName
         *          searchSelectionId (maybe)
         *          searchSelectionType (maybe)
         *      }
         *      directoryInstance (maybe)
         *      nextStep
         *      portal or portalArray (maybe)
         *  }
         *  return initial information for enter credentials view
         */
        initializeStep2Content: function (params) {
            // need a better name for scopeVars
            // scopeVars are the variables we will pass back to be used in the view
            var scopeVars = {
                newConnectionFields: {},
                connectionCredentials: {}
            };
            if (params.directoryLocation) {
                var directoryLocation = {
                    directoryLocationId: params.directoryLocation.directoryLocationId,
                    directoryLocationType: params.directoryLocation.directoryLocationType
                };
                scopeVars.directoryLocation = this.fetchDirectoryLocation(directoryLocation);
                var searchSelection = {
                    sourceId: params.directoryLocation.searchSelection,
                    type: params.directoryLocation.searchSelectionType
                };
                if (searchSelection.sourceId) {
                    if (searchSelection.type === 'PROVIDER') {
                        scopeVars.directoryLocation.providers = [];
                        scopeVars.directoryLocation.providers.push(params.directoryInstance);
                    } else if (searchSelection.type === 'PRACTICE') {
                        scopeVars.directoryLocation.practices = [];
                        scopeVars.directoryLocation.practices.push(params.directoryInstance);
                    }
                }
            }
            if (params.portal) {
                scopeVars.selectedPortal = mfUtils.getExtendedPortal(params.portal);
            }

            return mfConnect.findConnectionsForProfile(params.profileId)
                .then(function (connectionList) {
                    var existingConnection = null;

                    // check for existing connection
                    if (scopeVars.selectedPortal && scopeVars.selectedPortal.id) {
                        existingConnection = _.find(connectionList, function (connectionInstance) {
                            return '' + connectionInstance.portalId === '' + scopeVars.selectedPortal.id;
                        }) || null;
                    }

                    if (existingConnection) {
                        // extend connection
                        scopeVars.existingConnection = mfUtils.extendConnection(existingConnection, scopeVars.selectedPortal);
                    } else {
                        scopeVars.existingConnection = null;
                    }

                    return scopeVars;
                }, function (error) {
                    return Promise.reject(error);
                });
        },

        findConnectionById: function (connection) {
            return mfConnect.findConnectionById(connection.id, connection.profileId)
                .then(function (connection) {
                    return mfConnect.findPortalById(connection.portalId)
                        .then(function (portal) {
                            connection.associatedPortal = mfUtils.getExtendedPortal(portal);
                            var extendConnection = mfUtils.extendConnection(connection);
                            return extendConnection;
                        }, function (error) {
                            return Promise.reject(error);
                        });
                }, function (error) {
                    return Promise.reject(error);
                });
        },

        // Order of calls -
        // POST connections
        // PUT connections/id/refresh=true if there is a portal
        // return new connection
        createNewConnection: function (initialInfo, params) {
            var portalId = null;
            if (params.portal && params.portal.id) {
                portalId = params.portal.id;
            }

            var credentialInfo = {};
            if (!initialInfo.existingConnection || (initialInfo.existingConnection && initialInfo.existingConnection.errorNeedsUserAuth())) {
                credentialInfo.username = document.getElementById('connectionCredentials_username').value;
                credentialInfo.password = document.getElementById('connectionCredentials_password').value;
                // check undefined
            }

            var providerNameAlias = null;
            var locationType = null;
            var locationId = null;
            if (params.directoryLocation) {
                if (params.directoryLocation.searchSelectionName) {
                    providerNameAlias = params.directoryLocation.searchSelectionName;
                } else if (params.directoryLocation.directoryLocationName) {
                    providerNameAlias = params.directoryLocation.directoryLocationName;
                }
                if (params.directoryLocation.directoryLocationType) {
                    locationType = params.directoryLocation.directoryLocationType;
                }
                if (params.directoryLocation.directoryLocationId) {
                    locationId = params.directoryLocation.directoryLocationId;
                }
            }

            return mfConnect.createConnectionForProfile(params.profileId, portalId, locationId, locationType, providerNameAlias, credentialInfo)
                .then(function (newConnection) {
                    return newConnection;
                }, function (error) {
                    return Promise.reject(error);
                });
        },

        // returns address to display on connection overview
        getProviderConnectionDisplayAddress: function (provider) {
            var address = '';
            if (provider.directoryLocation && provider.directoryLocation.address) {
                address = provider.directoryLocation.address.city + ', ' + provider.directoryLocation.address.state;
                if (provider.directoryLocation.address.zipcode) {
                    address += ' ' + provider.directoryLocation.address.zipcode;
                }
            } else if (provider.city && provider.state) {
                address = provider.city + ', ' + provider.state;
            }
            return address;
        },

        // initialize information for connection overview, return profileData with extended connection list and associated providers
        findProfileConnectionsAndPortals: function () {
            var profileId = mfConnect.getProfileId();
            var profileData = {
                connectionsList: []
            };
            mfConnect.getMfConnectData().profileData = profileData;
            return mfConnect.findConnectionsForProfile(profileId)
                .then(function (connections) {
                    return mfUtils.findPortalsForConnections(connections)
                        .then(function (connectionsWithPortals) {
                            _.forEach(connectionsWithPortals, function (connection) {
                                var extendedConnection = mfUtils.extendConnection(connection);
                                profileData.connectionsList.push(extendedConnection);
                            });
                            return profileData;
                        });
                }, function (error) {
                    return Promise.reject(error);
                });
        },

        fetchPortalsByUrl: function (primaryUrl) {
            if (primaryUrl) {
                return mfConnect.fetchPortalsByUrl(primaryUrl)
                    .then(function (portals) {
                        var resultList = {
                            portals: portals
                        };

                        return resultList;
                    }, function (error) {
                        return Promise.reject(error);
                    });
            }
        },

        hasSuccessfulExistingConnection: function (viewParams) {
            if (!viewParams.existingConnection || (viewParams.existingConnection && viewParams.existingConnection.errorNeedsUserAuth())) {
                return false;
            }
            return true;
        },

        hasRecommendedPortals: function () {
            var portals = mfConnect.getMfConnectData()["recommendedPortals"];
            if (!Array.isArray(portals)) {
                return false;
            }
            return true;
        },

        removeAlreadyConnectedPortals: function (portals) {
            var alreadyConnected = mfConnect.getMfConnectData().profileData.connectionsList.map(function (portal) {
                return portal.portalId;
            });
            var newPortals = portals.filter(function (elem) {
                return alreadyConnected.indexOf(JSON.stringify(elem.portalId)) === -1;
            });

            return newPortals;
        },

        removeNullPortals: function (portals) {
            // null portal when fetch portal returns 404
            return portals.filter(function (portal) {
                return portal != null;
            });
        },

        findRecommendedPortalsListData: function () {
            if (!this.hasRecommendedPortals()) {
                return Promise.resolve([]);
            }
            var portals = mfConnect.getMfConnectData()["recommendedPortals"];
            portals = this.removeAlreadyConnectedPortals(portals);

            var promises = [];
            var _this = this;

            _.forEach(portals, function (userPortal) {

                var catchFn = function (error) {
                    if (error.status && error.status === 404) {
                        return null;
                    }
                    throw error;
                };
                var onGetPortal = function (portalMetadata) {
                    var recommendedPortal = {};
                    recommendedPortal.portal = portalMetadata;
                    if (undefined !== userPortal.directoryLocation) {
                        recommendedPortal.directoryLocation = _this.fetchDirectoryLocation(userPortal.directoryLocation);
                    }
                    return recommendedPortal;
                };
                var getOnePortalDataPromise = function () {
                    return mfConnect.findPortalById(userPortal.portalId).then(onGetPortal).catch(catchFn);
                };
                promises.push(getOnePortalDataPromise());
            });
            return Promise.all(promises).then(this.removeNullPortals);
        },

        findPortalsForConnections: function (connections) {
            var connectionPromises = [];

            _.forEach(connections, function (connection) {
                var promise = function () {
                    return mfConnect.findPortalById(connection.portalId)
                        .then(function (portal) {
                            connection.associatedPortal = mfUtils.getExtendedPortal(portal);
                            return connection;
                        });
                };
                connectionPromises.push(promise());
            });

            return Promise.all(connectionPromises);
        },

        updateConnection: function (connection) {
            var refresh = true;
            if (connection && (connection.associatedPortal && connection.associatedPortal.status !== 'ACTIVE')) {
                refresh = false;
            }
            return mfConnect.updateConnection(connection.profileId, connection, refresh)
                .then(function (connection) {
                    return mfConnect.findPortalById(connection.portalId)
                        .then(function (portal) {
                            connection.associatedPortal = mfUtils.getExtendedPortal(portal);
                            var extendConnection = mfUtils.extendConnection(connection);

                            if (extendConnection.errorNeedsUserAuth()) {
                                extendConnection.statusText = 'The username and password you provided were not accepted by this doctor\'s patient portal. Please verify credentials and try again.';
                            } else {
                                extendConnection.statusText = mfUtils.getConnectionStatusText(extendConnection);
                            }
                            return extendConnection;
                        }, function (error) {
                            return Promise.reject(error);
                        });
                }, function (error) {
                    return Promise.reject(error);
                });
        },

        getStatusStyleDetails: function (connection) {
            if (connection.isConnected()) {
                return {
                    gradientStyle: 'success',
                    connectionDetailMessage: 'Connected',
                    connectionManagementMessage: 'Connected',
                    bannerIcon: 'mf-icon__connected',
                    managementPageIcon: 'mf-icon__connected-small',
                    connectionManagementSecondaryStyle: 'mf-list__element--secondary'
                };
            }

            if (connection.isPending()) {
                return {
                    gradientStyle: 'pending',
                    connectionDetailMessage: 'This pending portal is not supported at this time',
                    connectionManagementMessage: 'Pending portal',
                    bannerIcon: 'mf-icon__pending',
                    managementPageIcon: 'mf-icon__pending-small',
                    connectionManagementSecondaryStyle: 'mf-list__element--secondary'
                };
            }

            if (connection.isRetrieving()) {
                return {
                    gradientStyle: 'refreshing',
                    connectionDetailMessage: 'Refreshing connection',
                    connectionManagementMessage: 'Refreshing connection',
                    bannerIcon: 'mf-icon__refreshing',
                    managementPageIcon: 'mf-icon__refreshing-small',
                    connectionManagementSecondaryStyle: 'mf-list__element--secondary'
                };
            }

            if (connection.hasAnyError()) {
                if (connection.errorNeedsUserInteraction() || connection.errorNeedsSecurityQuestions()) {
                    return {
                        gradientStyle: 'invalid',
                        connectionDetailMessage: 'Your portal is requiring you to make changes before we can retrieve your data.',
                        connectionManagementMessage: 'Interaction required',
                        bannerIcon: 'mf-icon__invalid',
                        managementPageIcon: 'mf-icon__invalid-small',
                        connectionManagementSecondaryStyle: 'mf-list__element--secondary-negative'
                    };
                }

                if (connection.errorNeedsUserAuth()) {
                    return {
                        gradientStyle: 'invalid',
                        connectionDetailMessage: 'The username and password provided were invalid',
                        connectionManagementMessage: 'Update your information',
                        bannerIcon: 'mf-icon__invalid',
                        managementPageIcon: 'mf-icon__invalid-small',
                        connectionManagementSecondaryStyle: 'mf-list__element--secondary-negative'
                    };
                }

                return {
                    gradientStyle: 'invalid',
                    connectionDetailMessage: 'Unknown error occurred. Try refreshing the connection, it may fix the issue.',
                    connectionManagementMessage: 'Unknown error',
                    bannerIcon: 'mf-icon__invalid',
                    managementPageIcon: 'mf-icon__invalid-small',
                    connectionManagementSecondaryStyle: 'mf-list__element--secondary-negative'
                };
            }

            if (connection.isUnsupported()) {
                return {
                    gradientStyle: 'unsupported',
                    connectionDetailMessage: 'Your portal is not supported at this time',
                    connectionManagementMessage: 'Not supported',
                    bannerIcon: 'mf-icon__unsupported',
                    managementPageIcon: 'mf-icon__unsupported-small',
                    connectionManagementSecondaryStyle: 'mf-list__element--secondary'
                };
            }

            return {
                gradientStyle: '',
                connectionDetailMessage: '',
                connectionManagementMessage: '',
                bannerIcon: '',
                managementPageIcon: '',
                connectionManagementSecondaryStyle: ''
            };
        },

        getConnectionStatusText: function (connection) {
            if (connection.isConnected()) {
                return 'Successfully linked and receiving data.';
            } else if (connection.errorNeedsUserAuth()) {
                return 'We can\'t access this connection. Please verify and re-enter your login details.';
            } else if (connection.errorNeedsUserInteraction()) {
                if (connection.connectionStatusMessage) {
                    return connection.connectionStatusMessage;
                } else {
                    return 'Please log in and accept the organization\'s Terms of Service.';
                }
            } else if (connection.hasUnknownError()) {
                return 'Unable to sync your account data. Please check back shortly.';
                //} else if (connection.hasPortalError()) {
                // need a better error message
                //return 'This organization cannot be synced at this time. Please check back later.';
            } else if (connection.isRefreshing()) {
                return 'We\'re currently checking the credentials of this connection.';
            } else if (connection.isUnderDevelopment()) {
                return 'We\'re adding support for this provider. We\'ll fetch your data once this provider is added.';
            } else if (connection.isSuspended()) {
                return 'This provider is experiencing connection issues. We\'ll fetch your data once that\'s fixed.';
            } else if (connection.isPending()) {
                return 'This is a pending portal. We\'ll fetch your data once this provider is added.'; //just placeholder text for now
            } else {
                return '';
            }
        },

        // pass in the portal that you want to extend with functions to make it easier for the ui to find portal status
        getExtendedPortal: function (portal) {

            var PORTAL_STATUS_TYPES = {
                // If we don't get a recognized status from the backend, we use NULL
                'NULL': 'NULL',
                // The rest of these are stolen directly from the backend
                'INACTIVE': 'INACTIVE',
                'ACTIVE': 'ACTIVE',
                'SUSPENDED': 'SUSPENDED',
                'IN_DEV': 'IN_DEV'
            };

            portal.getPortalStatus = function () {
                if (portal.status && PORTAL_STATUS_TYPES.hasOwnProperty(portal.status)) {
                    return PORTAL_STATUS_TYPES[portal.status];
                }
                return PORTAL_STATUS_TYPES.NULL;
            };

            portal.isActive = function () {
                return portal.getPortalStatus() === PORTAL_STATUS_TYPES.ACTIVE;
            };

            portal.isConnectable = function () {
                return _.includes([
                    PORTAL_STATUS_TYPES.ACTIVE,
                    PORTAL_STATUS_TYPES.SUSPENDED,
                    PORTAL_STATUS_TYPES.IN_DEV
                ], portal.getPortalStatus());
            };

            portal.isUnderDevelopment = function () {
                return portal.getPortalStatus() === PORTAL_STATUS_TYPES.IN_DEV;
            };

            portal.isSuspended = function () {
                return portal.getPortalStatus() === PORTAL_STATUS_TYPES.SUSPENDED;
            };

            portal.isInactive = function () {
                return portal.getPortalStatus() === PORTAL_STATUS_TYPES.INACTIVE;
            };

            portal.getPortalTypeName = function () {
                return portal.typeInfo.name;
            };

            portal.isPendingPortal = function () {
                return this.getPortalTypeName() === "PLACEHOLDER_PORTAL";
            };
            return portal;
        },

        extendConnection: function (connection, portal) {
            var CONNECTION_STATUS_TYPES = {
                'NO_PORTAL': 'NO_PORTAL',
                'PORTAL_INACTIVE': 'PORTAL_INACTIVE',
                'PORTAL_SUSPENDED': 'PORTAL_SUSPENDED',
                'PORTAL_UNDER_DEVELOPMENT': 'PORTAL_UNDER_DEVELOPMENT',
                'PENDING': 'PENDING',
                'REFRESHING': 'REFRESHING',
                'WAITING': 'WAITING',
                'PARTIAL_SUCCESS': 'PARTIAL_SUCCESS',
                'SUCCESS': 'SUCCESS',
                'UNKNOWN_ERROR': 'UNKNOWN_ERROR',
                'CREDENTIAL_ERROR': 'CREDENTIAL_ERROR',
                'SECURITY_QUESTION': 'SECURITY_QUESTION',
                'USER_INTERACTION': 'USER_INTERACTION',
                'PROFILES_FOUND': 'PROFILES_FOUND',
                'STATUS_UNKNOWN': 'STATUS_UNKNOWN',
                'PLACEHOLDER': 'PLACEHOLDER'
            };

            if (portal) {
                connection.associatedPortal = portal;
            }

            // list of associated providers with reference to connectionId and status
            connection.associatedProvidersList = connection.providers;

            var status = connection.connectionStatus;

            // may not need?
            connection.getConnectionStatus = function () {
                return connection.connectionStatus;
            };

            connection.isConnected = function () {
                return status === CONNECTION_STATUS_TYPES.SUCCESS ||
                    status === CONNECTION_STATUS_TYPES.PARTIAL_SUCCESS ||
                    status === CONNECTION_STATUS_TYPES.PROFILES_FOUND;
            };

            connection.hasEverBeenSuccessful = function () {
                return connection.hasEverSucceeded;
            };

            connection.errorNeedsUserAuth = function () {
                return connection.needsCredentialUpdate;
            };

            connection.errorNeedsUserInteraction = function () {
                return connection.needsUserInteraction;
            };

            connection.errorNeedsSecurityQuestions = function () {
                return connection.needsSecurityQuestions;
            };

            connection.hasUnknownError = function () {
                return status === CONNECTION_STATUS_TYPES.UNKNOWN_ERROR;
            };

            connection.noPortal = function () {
                return status === CONNECTION_STATUS_TYPES.NO_PORTAL;
            };

            connection.isInactive = function () {
                return status === CONNECTION_STATUS_TYPES.PORTAL_INACTIVE;
            };

            connection.isSuspended = function () {
                return status === CONNECTION_STATUS_TYPES.PORTAL_SUSPENDED;
            };

            connection.isUnderDevelopment = function () {
                return status === CONNECTION_STATUS_TYPES.PORTAL_UNDER_DEVELOPMENT;
            };

            connection.isPending = function () {
                return connection.isPlaceholder;
            };

            connection.isRefreshing = function () {
                return status === CONNECTION_STATUS_TYPES.REFRESHING;
            };

            connection.isScheduled = function () {
                return status === CONNECTION_STATUS_TYPES.PENDING;
            };

            connection.isInDev = function () {
                return connection.isUnderDevelopment();
            };

            connection.isUnsupported = function () {
                return connection.isSuspended() ||
                    connection.isInactive() ||
                    connection.noPortal() ||
                    (connection.isInDev() && !connection.isPending());
            };

	        connection.hasAnyError = function() {
		        return connection.errorNeedsUserAuth() ||
			        connection.errorNeedsSecurityQuestions() ||
                    connection.errorNeedsUserInteraction() ||
			        connection.hasUnknownError();
	        };

            connection.isRetrieving = function () {
                return connection.isScheduled() ||
                    connection.isRefreshing();
            };

            return connection;
        }
    };
})();

module.exports = mfUtils;
