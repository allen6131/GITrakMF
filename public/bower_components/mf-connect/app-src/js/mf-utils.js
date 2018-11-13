var mfConnect = require('../js/mf-connect-service.js');
var _ = require('lodash');
var Promise = require('bluebird');

var mfUtils = (function() {
    'use strict';

    return {

        // returns display name for places in search results list
        getPracticeDisplayName: function(practice) {
            var name = '';
            if (practice[0].practice && practice[0].office && practice[0].practice.name && practice[0].office.name) {
                name = _.startCase(practice[0].practice.name);
                if (_.toLower(practice[0].practice.name) !== _.toLower(practice[0].office.name)) {
                    name += ': ' + _.startCase(practice[0].office.name);
                }
            } else if (practice[0].practice && practice[0].facility && practice[0].practice.name && practice[0].facility.name) {
                name = _.startCase(practice[0].practice.name);
                if (_.toLower(practice[0].practice.name) !== _.toLower(practice[0].facility.name)) {
                    name = _.startCase(practice[0].facility.name) + ': ' + name;
                }
            } else if (practice[0].practice && practice[0].practice.name) {
                name = _.startCase(practice[0].practice.name);
            } else if (practice[0].office && practice[0].office.name) {
                name = _.startCase(practice[0].office.name);
            } else if (practice[0].facility && practice[0].facility.name) {
                name = _.startCase(practice[0].facility.name);
            } else {
                name = practice[0].address.address + ', ' + practice[0].address.city + ', ' + practice[0].address.state + ' ' + practice[0].address.zipcode;
            }
            return name;
        },

        // returns display address for places in search results list
        getPracticeDisplayAddress: function(practice) {
            if ((practice[0].practice && practice[0].practice.name) || (practice[0].office && practice[0].office.name) || (practice[0].facility && practice[0].facility.name)) {
                if (!practice[1]) {
                    return (practice[0].address.address ? practice[0].address.address + ', ' : '') + practice[0].address.city + ', ' + practice[0].address.state + ' ' + practice[0].address.zipcode;
                } else {
                    return 'Multiple locations';
                }
            } else {
                return '';
            }
        },

        // returns provider display name in search results list
        getProviderDisplayName: function(provider) {
            return _.startCase(provider[0].provider.firstName) + ' ' + _.startCase(provider[0].provider.lastName) +
                (provider[0].provider.degree ? ', ' + provider[0].provider.degree : '');
        },

        // returns provider display address in search results list
        getProviderDisplayAddress: function(provider) {
            if (!provider[1]) {
                return (provider[0].address.address ? provider[0].address.address + ', ' : '') + provider[0].address.city + ', ' + provider[0].address.state + ' ' + provider[0].address.zipcode;
            } else {
                return 'Multiple locations';
            }
        },

        getDirectoryLocationDisplayName: function(directoryLocation) {
            var name = '';
            if (directoryLocation.practice && directoryLocation.practice.name && directoryLocation.name) {
                if (_.toLower(directoryLocation.practice.name) === _.toLower(directoryLocation.name)) {
                    name = _.startCase(directoryLocation.name);
                } else {
                    name = _.startCase(directoryLocation.practice.name) + ': ' + _.startCase(directoryLocation.name);
                }
            } else if (directoryLocation.practice && directoryLocation.practice.name) {
                name = directoryLocation.practice.name;
            } else if (directoryLocation.name) {
                name = directoryLocation.name;
            }
            return name;
        },
        getAddressDisplayName: function(address) {
            var st = address.address ? address.address + ', ' : '';
            return st + address.city + ', ' + address.state + ' ' + address.zipcode;
        },

        /*
         *  returns results from search separated into providers and practices
         */
        getDirectorySearchResults: function(searchTerm, zipCode) {

            searchTerm = _.trim(searchTerm);
            if (_.startsWith(_.toLower(searchTerm), 'dr.') || _.startsWith(_.toLower(searchTerm), 'dr ')) {
                searchTerm = searchTerm.slice(3);
            }
            var searchParams = {
                q: searchTerm,
                filterByZip: zipCode,
                limit: 100
            };

            return mfConnect.findAllDirectorySearch(searchParams)
                .then(function(directoryResults) {
                    // filter out result list
                    var resultList = {
                        providers: [],
                        practices: []
                    };

                    resultList.providers = _.filter(directoryResults, function(directoryResult) {
                        return !!directoryResult.provider;
                    });

                    resultList.practices = _.filter(directoryResults, function(directoryResult) {
                        return !directoryResult.provider;
                    });

                    return resultList;
                }, function(error) {
                    return Promise.reject(error);
                });
        },

        /*
         * returns an object with the name of the next step, directoryLocation, and possibly directoryInstance or portal or portalArray
         */
        selectDirectoryObject: function(directoryObjectArray) {
            var params = {
                directoryLocation: {},
                nextStep: '',
                directoryInstance: {}
            };

            if (directoryObjectArray[0].provider && directoryObjectArray[0].provider.sourceId) {
                return mfConnect.fetchProviderById(directoryObjectArray[0].provider.sourceId, true)
                    .then(function(providerInstance) {
                        params.directoryLocation.searchSelection = directoryObjectArray[0].provider.sourceId;
                        params.directoryLocation.searchSelectionType = 'PROVIDER';
                        params.directoryInstance = providerInstance;

                        if ((providerInstance.offices && providerInstance.facilities && (providerInstance.offices.length + providerInstance.facilities.length) > 1) ||
                            (providerInstance.facilities && providerInstance.facilities.length > 1) ||
                            (providerInstance.offices && providerInstance.offices.length > 1)) {
                            params.nextStep = 'createConnectionSelectLocation';
                            return params;
                        } else {
                            if (providerInstance.offices[0]) {
                                params.directoryLocation.directoryLocationId = providerInstance.offices[0].sourceId;
                                params.directoryLocation.directoryLocationType = 'OFFICE';

                                return mfConnect.findByDirectoryId(providerInstance.offices[0].sourceId, 'OFFICE')
                                    .then(function(portalArray) {
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
                                    }, function(error) {
                                        return Promise.reject(error);
                                    });
                            } else {
                                params.directoryLocation.directoryLocationId = providerInstance.facilities[0].sourceId;
                                params.directoryLocation.directoryLocationType = 'FACILITY';

                                return mfConnect.findByDirectoryId(providerInstance.facilities[0].sourceId, 'FACILITY')
                                    .then(function(portalArray) {
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
                                    }, function(error) {
                                        return Promise.reject(error);
                                    });
                            }
                        }
                    }, function(error) {
                        return Promise.reject(error);
                    });
            } else if (directoryObjectArray[0].practice && directoryObjectArray[0].practice.sourceId) {
                return mfConnect.fetchPracticeById(directoryObjectArray[0].practice.sourceId, true)
                    .then(function(practiceInstance) {
                        params.directoryLocation.searchSelection = directoryObjectArray[0].practice.sourceId;
                        params.directoryLocation.searchSelectionType = 'PRACTICE';
                        params.directoryInstance = practiceInstance;

                        if (practiceInstance.offices && practiceInstance.offices.length > 1) {
                            params.nextStep = 'createConnectionSelectLocation';
                            return params;
                        } else {
                            params.directoryLocation.directoryLocationId = practiceInstance.offices[0].sourceId;
                            params.directoryLocation.directoryLocationType = 'OFFICE';

                            return mfConnect.findByDirectoryId(practiceInstance.offices[0].sourceId, 'OFFICE')
                                .then(function(portalArray) {
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
                                }, function(error) {
                                    return Promise.reject(error);
                                });
                        }
                    }, function(error) {
                        return Promise.reject(error);
                    });
            } else if (directoryObjectArray[0].office && directoryObjectArray[0].office.sourceId) {
                params.directoryLocation.directoryLocationId = directoryObjectArray[0].office.sourceId;
                params.directoryLocation.directoryLocationType = 'OFFICE';

                return mfConnect.findByDirectoryId(directoryObjectArray[0].office.sourceId, 'OFFICE')
                    .then(function(portalArray) {
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
                    }, function(error) {
                        return Promise.reject(error);
                    });
            } else if (directoryObjectArray[0].facility && directoryObjectArray[0].facility.sourceId) {
                params.directoryLocation.directoryLocationId = directoryObjectArray[0].facility.sourceId;
                params.directoryLocation.directoryLocationType = 'FACILITY';

                return mfConnect.findByDirectoryId(directoryObjectArray[0].facility.sourceId, 'FACILITY')
                    .then(function(portalArray) {
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
                    }, function(error) {
                        return Promise.reject(error);
                    });
            }

        },

        /*
         *  check if location has multiple portals and returns params object with information for next step
         */
        checkForMultiplePortals: function(location, parameters) {

            var params = parameters;
            params.nextStep = '';

            params.directoryLocation.directoryLocationId = location.locationInfo.sourceId;
            params.directoryLocation.directoryLocationType = location.locationType;

            return mfConnect.findByDirectoryId(location.locationInfo.sourceId, location.locationType)
                .then(function(portalArray) {
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
                }, function(error) {
                    return Promise.reject(error);
                });
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
        initializeStep2Content: function(params) {
            // need a better name for scopeVars
            // scopeVars are the variables we will pass back to be used in the view
            var scopeVars = {
                newConnectionFields: {},
                connectionCredentials: {}
            };
            var directoryLocation = {
                directoryLocationId: params.directoryLocation.directoryLocationId,
                directoryLocationType: params.directoryLocation.directoryLocationType
            };
            var searchSelection = {
                sourceId: params.directoryLocation.searchSelection,
                type: params.directoryLocation.searchSelectionType
            };
            if (params.portal) {
                scopeVars.selectedPortal = mfUtils.getExtendedPortal(params.portal);
            }
            if (directoryLocation.directoryLocationType === 'OFFICE') {
                scopeVars.directoryLocation = mfConnect.fetchOfficeById(directoryLocation.directoryLocationId);
            } else if (directoryLocation.directoryLocationType === 'FACILITY') {
                scopeVars.directoryLocation = mfConnect.fetchFacilityById(directoryLocation.directoryLocationId);
            }

            if (searchSelection.sourceId) {
                if (searchSelection.type === 'PROVIDER') {
                    scopeVars.directoryLocation.providers = [];
                    scopeVars.directoryLocation.providers.push(params.directoryInstance);
                } else if (searchSelection.type === 'PRACTICE') {
                    scopeVars.directoryLocation.practices = [];
                    scopeVars.directoryLocation.practices.push(params.directoryInstance);
                }
            }

            return mfConnect.findConnectionsForProfile(params.profileId)
                .then(function(connectionList) {
                    var existingConnection = null;

                    // check for existing connection
                    if (scopeVars.selectedPortal && scopeVars.selectedPortal.id) {
                        existingConnection = _.find(connectionList, function(connectionInstance) {
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
                }, function(error) {
                    return Promise.reject(error);
                });

        },

        // Order of calls -
        // POST connections
        // PUT connections/id/refresh=true if there is a portal
        // return new connection
        createNewConnection: function(initialInfo, params) {

            var connectionInfo = {
                directoryLocation: initialInfo.directoryLocation,
                credentials: {}
            };
            if (params.portal && params.portal.id) {
                connectionInfo.portalId = params.portal.id;
            }
            if (!initialInfo.existingConnection || (initialInfo.existingConnection && initialInfo.existingConnection.needsUserAuth())) {
                connectionInfo.credentials.username = document.getElementById('connectionCredentials_username').value;
                connectionInfo.credentials.password = document.getElementById('connectionCredentials_password').value;
                // check undefined
            }

            if (params.directoryLocation && params.directoryLocation.searchSelectionName) {
                connectionInfo.providerNameAlias = params.directoryLocation.searchSelectionName;
            } else if (params.directoryLocation && params.directoryLocation.directoryLocationName) {
                connectionInfo.providerNameAlias = params.directoryLocation.directoryLocationName;
            }

            return mfConnect.createConnectionForProfile(params.profileId, connectionInfo)
                .then(function(newConnection) {
                    return newConnection;
                }, function(error) {
                    return Promise.reject(error);
                });
        },

        // returns address to display on connection overview
        getProviderConnectionDisplayAddress: function(provider) {
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
        initializeConnectionOverview: function() {

            var profileId = mfConnect.getProfileId();
            var profileData = {
                extendedConnectionList: [],
                associatedProviders: []
            };

            return mfConnect.findConnectionsForProfile(profileId)
                .then(function(connections) {
                    return mfUtils.findPortalsForConnections(connections)
                        .then(function(connectionsWithPortals) {
                            _.forEach(connectionsWithPortals, function(connection) {
                                var extendedConnection = mfUtils.extendConnection(connection);
                                profileData.extendedConnectionList.push(extendedConnection);
                                profileData.associatedProviders = profileData.associatedProviders.concat(extendedConnection.associatedProvidersList);
                            });
                            return profileData;
                        });
                }, function(error) {
                    return Promise.reject(error);
                });
        },

        findPortalsForConnections: function(connections) {
            var connectionPromises = [];

            _.forEach(connections, function(connection) {
                var promise = function() {
                    return mfConnect.findOnePortalById(connection.portalId)
                        .then(function(portal) {
                            connection.associatedPortal = mfUtils.getExtendedPortal(portal);
                            return connection;
                        });
                };
                connectionPromises.push(promise());
            });

            return Promise.all(connectionPromises);
        },

        findConnectionForProvider: function(provider, connections) {
            var connectionIndex = _.findIndex(connections, function(connection) {
                return connection.id === provider.connectionId;
            });

            return connections[connectionIndex];
        },

        updateConnection: function(connectionFields, existingConnection) {
            var refresh = true;
            if (existingConnection && (existingConnection.associatedPortal && existingConnection.associatedPortal.status !== 'ACTIVE')) {
                refresh = false;
            }
            return mfConnect.updateConnection(connectionFields, refresh)
                .then(function(connection) {
                    return mfConnect.findOnePortalById(connection.portalId)
                        .then(function(portal) {
                            connection.associatedPortal = mfUtils.getExtendedPortal(portal);
                            var extendConnection = mfUtils.extendConnection(connection);

                            if (extendConnection.needsUserAuth()) {
                                extendConnection.statusText = 'The username and password you provided were not accepted by this doctor\'s patient portal. Please verify credentials and try again.';
                            } else {
                                extendConnection.statusText = mfUtils.getConnectionStatusText(extendConnection);
                            }
                            return extendConnection;
                        }, function(error) {
                            return Promise.reject(error);
                        });
                }, function(error) {
                    return Promise.reject(error);
                });
        },

        getConnectionStatusText: function(connection) {
            if (connection.isCompleted()) {
                return 'Successfully linked and receiving data.';
            } else if (connection.needsUserAuth()) {
                return 'We can\'t access this connection. Please verify and re-enter your login details.';
            } else if (connection.needsUserInteraction()) {
                if (connection.latestJob.jobStatusMessage) {
                    return connection.latestJob.jobStatusMessage;
                } else {
                    return 'Please log in and accept the organization\'s Terms of Service.';
                }
            } else if (connection.hasInternalError()) {
                return 'Unable to sync your account data. Please check back shortly.';
            } else if (connection.hasPortalError()) {
                // need a better error message
                return 'This organization cannot be synced at this time. Please check back later.';
            } else if (connection.isRefreshing()) {
                return 'We\'re currently checking the credentials of this connection.';
            } else if (connection.associatedPortal.isUnderDevelopment()) {
                return 'We\'re adding support for this provider. We\'ll fetch your data once this provider is added.';
            } else if (connection.associatedPortal.isSuspended()) {
                return 'This provider is experiencing connection issues. We\'ll fetch your data once that\'s fixed.';
            } else {
                return '';
            }
        },

        // pass in the portal that you want to extend with functions to make it easier for the ui to find portal status
        getExtendedPortal: function(portal) {

            var PORTAL_STATUS_TYPES = {
                // If we don't get a recognized status from the backend, we use NULL
                'NULL': 'NULL',
                // The rest of these are stolen directly from the backend
                'INACTIVE': 'INACTIVE',
                'ACTIVE': 'ACTIVE',
                'SUSPENDED': 'SUSPENDED',
                'IN_DEV': 'IN_DEV'
            };

            portal.getPortalStatus = function() {
                if (portal.status && PORTAL_STATUS_TYPES.hasOwnProperty(portal.status)) {
                    return PORTAL_STATUS_TYPES[portal.status];
                }
                return PORTAL_STATUS_TYPES.NULL;
            };

            portal.isActive = function() {
                return portal.getPortalStatus() === PORTAL_STATUS_TYPES.ACTIVE;
            };

            portal.isConnectable = function() {
                return _.includes([
                    PORTAL_STATUS_TYPES.ACTIVE,
                    PORTAL_STATUS_TYPES.SUSPENDED,
                    PORTAL_STATUS_TYPES.IN_DEV
                ], portal.getPortalStatus());
            };

            portal.isUnderDevelopment = function() {
                return portal.getPortalStatus() === PORTAL_STATUS_TYPES.IN_DEV;
            };

            portal.isSuspended = function() {
                return portal.getPortalStatus() === PORTAL_STATUS_TYPES.SUSPENDED;
            };

            portal.getPortalTypeName = function() {
                return portal.typeInfo.name;
            };

            portal.isPendingPortal = function() {
                return this.getPortalTypeName() === "PLACEHOLDER_PORTAL";
            };
            return portal;
        },

        // pass in the connection you would like to extend with more information for making it easier to call back on
        // if portal is passed in, it should be an already extended portal
        extendConnection: function(connection, portal) {
            // These are the UI's self-made statuses for a connection: we look at the connection's portal,
            // current job ticket (if any), and possibly some timestamps, then we make a judgment about what seems
            // to be be going on.
            var CONNECTION_STATUS_TYPES = {
                // This is our default; it should never actually occur unless there's a catastrophic js error
                'NULL': 'NULL',
                // 'Completed' basically means the connection looks healthy: it's enabled and has no errors and no
                // ongoing tickets.
                'COMPLETED_FULL':               'COMPLETED_FULL',
                'COMPLETED_PARTIAL':            'COMPLETED_PARTIAL',
                // 'Error' can mean there's a problem with the connection's portal, or with the last ticket
                'ERROR_USER_AUTH':              'ERROR_USER_AUTH',
                'ERROR_NEEDS_USER_INTERACTION': 'ERROR_NEEDS_USER_INTERACTION',
                'ERROR_INTERNAL':               'ERROR_INTERNAL',
                'ERROR_PORTAL_GONE':            'ERROR_PORTAL_GONE',
                // If a portal is under development, we can't refresh it, but it's not an error
                'PORTAL_UNDER_DEVELOPMENT':		'PORTAL_UNDER_DEVELOPMENT',
                // If a portal is suspended, we can't refresh, but it's not an error
                'PORTAL_SUSPENDED':				'PORTAL_SUSPENDED',
                // 'Refreshing' means our last ticket has not completed yet (or maybe it hasn't even been started yet)
                'REFRESHING_SCHEDULED':         'REFRESHING_SCHEDULED',
                'REFRESHING_SUBMITTED':         'REFRESHING_SUBMITTED',
                'REFRESHING_PROBABLY_SCRAPING': 'REFRESHING_PROBABLY_SCRAPING',
                'REFRESHING_STALLED':           'REFRESHING_STALLED',
                // This is used *only* for just-created connections in the end-to-end tests
                'NEW_E2E_CONNECTION':           'NEW_E2E_CONNECTION'
            };

            // These are based on the backend's status types, found under latestJob.jobStatus
            // (/common/claire-common/src/main/java/com/medfusion/claire/data/DreStatusType.java)
            // The value under each index can be used to map/combine several statuses together (e.g., to treat
            // unrecognized status values as errors.)
            var JOB_STATUS_TYPES = {
                // If we don't get a recognized status from the backend, we use NULL
                'NULL': 'NULL',
                // The rest of these are stolen directly from the backend
                'SCHEDULED':                    'SCHEDULED',
                'SUBMITTED':                    'SUBMITTED',
                'SUBMITTED_STALE':              'SUBMITTED_STALE',
                'WAITING':                      'WAITING',
                'PARTIAL_SUCCESS':              'PARTIAL_SUCCESS',
                'SUCCESS':                      'SUCCESS',
                'ERROR_OTHER':                  'ERROR_OTHER',
                'ERROR_USER_AUTH':              'ERROR_USER_AUTH',
                'ERROR_NEEDS_USER_INTERACTION': 'ERROR_NEEDS_USER_INTERACTION',
                'ERROR_USER_TOS':               'ERROR_NEEDS_USER_INTERACTION', // note that this is an alias
                // These two values are *possible* future statuses; they're added here so that this version of
                // the UI will handle them in a reasonably appropriate way if they do appear.
                'PORTAL_UNREACHABLE':           'PORTAL_UNREACHABLE',
                'UNREACHABLE':                  'PORTAL_UNREACHABLE'
            };

            // If a JOB_STATUS_TYPE *exactly maps* to a CONNECTION_STATUS_MAP, we put it here.
            // See getConnectionStatus() for the full algorithm, though, because we don't always use this.
            var mapJobStatusToConnectionStatus = {
                'NULL':                         'ERROR_INTERNAL',
                'SUBMITTED_STALE':              'ERROR_INTERNAL',
                'PARTIAL_SUCCESS':              'COMPLETED_PARTIAL',
                'WAITING':                      'COMPLETED_PARTIAL',
                'SUCCESS':                      'COMPLETED_FULL',
                'ERROR_OTHER':                  'ERROR_INTERNAL',
                'ERROR_USER_AUTH':              'ERROR_USER_AUTH',
                'ERROR_NEEDS_USER_INTERACTION': 'ERROR_NEEDS_USER_INTERACTION',
                'PORTAL_UNREACHABLE':           'PORTAL_SUSPENDED'
            };

            if (portal) {
                connection.associatedPortal = portal;
            }

            connection.connectionHasCompleted = function() {
                connection._hasEverSucceeded = true;

                // idk what this should return
                //return _.map(ConnectionService._connectionCompletionCallbacks, function(callbackFn) {
                //  return callbackFn(this);
                //}.bind(this));
            };

            connection.getConnectionStatus = function() {

                var connectionStatus = CONNECTION_STATUS_TYPES.NULL;
                var portalStatus = connection.associatedPortal && connection.associatedPortal.getPortalStatus();
                var lastJobStatus = connection.getLastJobStatus();

                if (!portalStatus || portalStatus !== 'ACTIVE') {
                    // Portal problems take precedence over everything else.
                    // We default to 'GONE' for missing/unknown values
                    if (portalStatus === 'SUSPENDED') {
                        connectionStatus = CONNECTION_STATUS_TYPES.PORTAL_SUSPENDED;
                    } else if (portalStatus === 'IN_DEV') {
                        connectionStatus = CONNECTION_STATUS_TYPES.PORTAL_UNDER_DEVELOPMENT;
                    } else {
                        connectionStatus = CONNECTION_STATUS_TYPES.ERROR_PORTAL_GONE;
                    }
                } else if (mapJobStatusToConnectionStatus.hasOwnProperty(lastJobStatus)) {
                    // Many (but not all) lastJob types map directly to a connection type.
                    connectionStatus = mapJobStatusToConnectionStatus[lastJobStatus];
                } else {
                    // For now, only 'SCHEDULED' and 'SUBMITTED' are left -- we process those differently based
                    // on how long the connection has been in that state:
                    //      Scheduled for <60s  = waiting in queue
                    //      Scheduled for 60s+  = we seem to be stalled
                    //      Submitted for <30s  = waiting in queue
                    //      Submitted for 30s+ but <90s = we're probably scraping
                    //      Submitted for 90s+  = we seem to be stalled
                    var timeSinceLastStatusChange = Date.now() - connection._lastJobStatusChange;
                    if (lastJobStatus === JOB_STATUS_TYPES.SCHEDULED) {
                        if (timeSinceLastStatusChange < 60 * 1000) {
                            connectionStatus = CONNECTION_STATUS_TYPES.REFRESHING_SCHEDULED;
                        } else {
                            connectionStatus = CONNECTION_STATUS_TYPES.REFRESHING_STALLED;
                        }
                    } else if (lastJobStatus === JOB_STATUS_TYPES.SUBMITTED) {
                        if (timeSinceLastStatusChange < 30 * 1000) {
                            connectionStatus = CONNECTION_STATUS_TYPES.REFRESHING_SUBMITTED;
                        } else if (timeSinceLastStatusChange < 90 * 1000) {
                            connectionStatus = CONNECTION_STATUS_TYPES.REFRESHING_PROBABLY_SCRAPING;
                        } else {
                            connectionStatus = CONNECTION_STATUS_TYPES.REFRESHING_STALLED;
                        }
                    } else {
                        // If all else fails, assume it's an error of some sort
                        connectionStatus = CONNECTION_STATUS_TYPES.ERROR_INTERNAL;
                    }
                }

                if (connection._lastConnectionStatus !== connectionStatus) {
                    // it's changed!
                    //debugInfo('new connectionStatus: ' + this._lastConnectionStatus + ' -> ' + connectionStatus, this);
                    connection._lastConnectionStatus = connectionStatus;
                    connection._lastConnectionStatusChange = Date.now();

                    if (connection.isCompleted()) {
                        connection._hasEverSucceeded = true;
                        //connection.connectionHasCompleted();
                    }
                }

                return connectionStatus;
            };

            connection.getLastJobStatus = function() {
                var jobStatus = connection.latestJob && connection.latestJob.jobStatus;
                if (jobStatus) {
                    if (JOB_STATUS_TYPES.hasOwnProperty(jobStatus)) {
                        jobStatus = JOB_STATUS_TYPES[jobStatus];
                    } else if (/^ERROR_/.test(jobStatus)) {
                        // Special case: there's a new error status that we don't yet recognize.
                        // We want to treat it as a generic error, instead of an unknown/recognized status.
                        jobStatus = JOB_STATUS_TYPES.ERROR_OTHER;
                    }
                }
                if (!jobStatus) {
                    jobStatus = JOB_STATUS_TYPES.NULL;
                }

                if (connection._lastJobStatus !== jobStatus) {
                    // it's changed!
                    //debugInfo('new jobStatus: ' + this._lastJobStatus + ' -> ' + jobStatus, this);
                    connection._lastJobStatus = jobStatus;
                    connection._lastJobStatusChange = Date.now();
                }

                return jobStatus;
            };

            connection.isCompleted = function() {
                //return _.includes([
                //  CONNECTION_STATUS_TYPES.COMPLETED_FULL,
                // CONNECTION_STATUS_TYPES.COMPLETED_PARTIAL
                //], connection.getConnectionStatus());
                if (connection.getConnectionStatus() === CONNECTION_STATUS_TYPES.COMPLETED_FULL || connection.getConnectionStatus() === CONNECTION_STATUS_TYPES.COMPLETED_PARTIAL) {
                    return true;
                }
                return false;
            };

            connection.needsUserAuth = function() {
                return connection.getConnectionStatus() === CONNECTION_STATUS_TYPES.ERROR_USER_AUTH;
            };

            connection.needsUserInteraction = function() {
                return connection.getConnectionStatus() === CONNECTION_STATUS_TYPES.ERROR_NEEDS_USER_INTERACTION;
            };

            connection.hasInternalError = function() {
                return connection.getConnectionStatus() === CONNECTION_STATUS_TYPES.ERROR_INTERNAL;
            };

            connection.hasPortalError = function() {
                return connection.getConnectionStatus() === CONNECTION_STATUS_TYPES.ERROR_PORTAL_GONE;
            };

            connection.isRefreshing = function() {
                if (connection.getConnectionStatus() === CONNECTION_STATUS_TYPES.REFRESHING_SCHEDULED ||
                    connection.getConnectionStatus() === CONNECTION_STATUS_TYPES.REFRESHING_SUBMITTED ||
                    connection.getConnectionStatus() === CONNECTION_STATUS_TYPES.REFRESHING_PROBABLY_SCRAPING ||
                    connection.getConnectionStatus() === CONNECTION_STATUS_TYPES.REFRESHING_STALLED) {
                    return true;
                }
                return false;
            };

            connection.hasAnyError = function() {
                if (connection.getConnectionStatus() === CONNECTION_STATUS_TYPES.ERROR_USER_AUTH ||
                    connection.getConnectionStatus() === CONNECTION_STATUS_TYPES.ERROR_NEEDS_USER_INTERACTION ||
                    connection.getConnectionStatus() === CONNECTION_STATUS_TYPES.ERROR_INTERNAL ||
                    connection.getConnectionStatus() === CONNECTION_STATUS_TYPES.ERROR_PORTAL_GONE) {
                    return true;
                }
                return false;
            };

            // list of associated providers with reference to connectionId and status
            connection.associatedProvidersList = [];
            _.forEach(connection.providers, function(provider) {
                // reference back to this connection
                provider.connectionId = connection.id;
                provider.connectionStatus = connection.getConnectionStatus();
                connection.associatedProvidersList.push(provider);
            });

            return connection;

        }
    };
})();

module.exports = mfUtils;
