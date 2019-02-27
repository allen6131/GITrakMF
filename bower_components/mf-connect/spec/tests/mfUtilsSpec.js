describe('mf-utils', function() {
    var mfUtils = require('../../app-src/js/mf-utils');
    var mfConnect = require('../../app-src/js/mf-connect-service');
    var practiceMocks;
    var providerMocks;
    var MfConnect = window.MfConnect;

    describe('when search results are displayed', function() {
        beforeEach(function() {
            practiceMocks = [
                // location with practice name, office name, and address
                [{
                    practice: {
                        name: 'Practice'
                    },
                    office: {
                        name: 'Office'
                    },
                    address: {
                        address: '123 address',
                        city: 'Raleigh',
                        state: 'NC',
                        zipcode: '27603'
                    }
                }],
                // location with office name and no practice name; location with multiple locations
                [{
                    office: {
                        name: 'Office without practice'
                    },
                    address: {
                        address: '123 address',
                        city: 'Raleigh',
                        state: 'NC',
                        zipcode: '27603'
                    }
                }, {
                    office: {
                        name: 'Office2'
                    },
                    address: {
                        address: '13 address',
                        city: 'Cary',
                        state: 'NC',
                        zipcode: '27518'
                    }
                }],
                // location without practice or office name
                [{
                    office: {},
                    address: {
                        address: '13 address',
                        city: 'Cary',
                        state: 'NC',
                        zipcode: '27518'
                    }
                }]
            ];
            providerMocks = [
                // provider with degree and address
                [{
                    provider: {
                        firstName: 'Emily',
                        lastName: 'Miller',
                        degree: 'Dr.'
                    },
                    address: {
                        address: 'street',
                        city: 'Cary',
                        state: 'NC',
                        zipcode: '27518'
                    }
                }],
                // provider without degree and multiple locations
                [{
                    provider: {
                        firstName: 'Emily',
                        lastName: 'Miller'
                    },
                    address: {
                        address: 'street',
                        city: 'Cary',
                        state: 'NC',
                        zipcode: '27518'
                    }
                }, {
                    provider: {
                        firstName: 'Heather',
                        lastName: 'Test'
                    },
                    address: {
                        address: 'street',
                        city: 'Raleigh',
                        state: 'NC',
                        zipcode: '27603'
                    }
                }]
            ];
        });

        it('should display practice name and address', function() {
            var name = mfUtils.getPracticeDisplayName(practiceMocks[0]);
            var address = mfUtils.getPracticeDisplayAddress(practiceMocks[0]);

            expect(name).toEqual('Practice: Office');
            expect(address).toEqual('123 address, Raleigh, NC 27603');
        });

        it('should display office name and multiple locations', function() {
            var name = mfUtils.getPracticeDisplayName(practiceMocks[1]);
            var address = mfUtils.getPracticeDisplayAddress(practiceMocks[1]);

            expect(name).toEqual('Office Without Practice');
            expect(address).toEqual('Multiple locations');
        });

        it('should display address as practice name', function() {
            var name = mfUtils.getPracticeDisplayName(practiceMocks[2]);
            var address = mfUtils.getPracticeDisplayAddress(practiceMocks[2]);

            expect(name).toEqual('13 address, Cary, NC 27518');
            expect(address).toEqual('');
        });

        it('should display provider name with degree and address', function() {
            var name = mfUtils.getProviderDisplayName(providerMocks[0]);
            var address = mfUtils.getProviderDisplayAddress(providerMocks[0]);

            expect(name).toEqual('Emily Miller, Dr.');
            expect(address).toEqual('street, Cary, NC 27518');
        });

        it('should display provider name and multiple locations', function() {
            var name = mfUtils.getProviderDisplayName(providerMocks[1]);
            var address = mfUtils.getProviderDisplayAddress(providerMocks[1]);

            expect(name).toEqual('Emily Miller');
            expect(address).toEqual('Multiple locations');
        });

    });

    describe('directory search results', function() {
        var searchTerm, zipCode, paramsMocks, directoryObjectArray;

        beforeEach(function() {
            searchTerm = 'dr. miller';
            zipCode = '27603';

            directoryObjectArray = [[{
                provider: {
                    sourceId: '123.mf'
                }
            }], [{
                practice: {
                    sourceId: '321.mf'
                }
            }], [{
                office: {
                    sourceId: '456.mf'
                }
            }], [{
                facility: {
                    sourceId: '654.mf'
                }
            }]];

            // need directory mock data
            paramsMocks = [{
                directoryLocation: {
                    directoryLocationId: '321.mf',
                    directoryLocationType: 'PRACTICE',
                    directoryLocationName: 'Practice 1'
                },
                portal: {
                    id: 80,
                    status: 'ACTIVE'
                }
            }, {
                directoryLocation: {
                    directoryLocationId: 'office.mf',
                    directoryLocationType: 'OFFICE',
                    directoryLocationName: 'office 1',
                    searchSelection: 'practice.mf',
                    searchSelectionType: 'PRACTICE',
                    searchSelectionName: 'Practice 1'
                },
                portal: {
                    id: 80,
                    status: 'ACTIVE'
                }
            }];
        });

        it('should get directory search results', function() {
            mfUtils.findDirectoryLocations(searchTerm, zipCode);
        });

        // provider
        it('should select provider', function() {
            mfUtils.selectDirectoryObject(directoryObjectArray[0]);
        });

        // practice
        it('should select practice', function() {
            mfUtils.selectDirectoryObject(directoryObjectArray[1]);
        });

        // office
        it('should select office', function() {
            mfUtils.selectDirectoryObject(directoryObjectArray[2]);
        });

        // facility
        it('should select facility', function() {
            mfUtils.selectDirectoryObject(directoryObjectArray[3]);
        });

        // multiple portals
        it('should find multiple portals', function() {
            var location = {
                locationType: 'OFFICE',
                locationInfo: {
                    sourceId: 'office.mf'
                }
            };
            var locationParams = {
                nextStep: 'createConnectionSelectLocation',
                directoryLocation: {
                    searchSelectionType: 'PROVIDER',
                    searchSelection: 'provider.mf'
                },
                directoryInstance: {}
            };
            mfUtils.checkForMultiplePortals(location, locationParams);
        });

        it('should initialize step 2 with search selections', function() {
            mfUtils.initializeStep2Content(paramsMocks[0]);
        });

        it('should create new connection', function() {
            var initialMfConnect = new MfConnect();
            initialMfConnect.openModal();
            var initialInfo = {
                directoryLocation: {}
            };
            //document.getElementById('connectionCredentials_username').value = 'emilytest';
            //document.getElementById('connectionCredentials_password').value = 'password';
            //mfUtils.createNewConnection(initialInfo, paramsMocks[1]);
        });
    });

    describe('getProviderConnectionDisplayAddress', function() {
        var providerConnections;
        beforeEach(function() {
            // array of different provider connections
            providerConnections = [{
                directoryLocation: {
                    address: {
                        city: 'Raleigh',
                        state: 'NC',
                        zipcode: '27603'
                    }
                }
            }, {
                city: 'Raleigh',
                state: 'NC'
            }, {
                city: 'Raleigh'
            }]
        });

        it('should return full address', function() {
            var address = mfUtils.getProviderConnectionDisplayAddress(providerConnections[0]);

            expect(address).toEqual('Raleigh, NC 27603')
        });

        it('should return city and state', function() {
            var address = mfUtils.getProviderConnectionDisplayAddress(providerConnections[1]);

            expect(address).toEqual('Raleigh, NC')
        });

        it('should return no address', function() {
            var address = mfUtils.getProviderConnectionDisplayAddress(providerConnections[2]);

            expect(address).toEqual('')
        });
    });

    it('should find connection for provider', function() {
        var provider = {
            connectionId: 13
        };
        var connections = [{
            id: 1
        }, {
            id: 2
        }, {
            id: 13
        }];

        var connection = mfUtils.findConnectionForProvider(provider, connections);

        expect(connection).toEqual(connections[2]);
        expect(connection).not.toEqual(connections[0]);
    });

    describe('all possible connection status', function() {
        var possibleConnections;
        var possiblePortals;
        beforeEach(function() {
            possibleConnections = [{
                latestJob: {
                    jobStatus: 'SUCCESS'
                },
                providers: [{
                    nameAlias: 'emily'
                }],
                id: 1
            }, {
                latestJob: {
                    jobStatus: 'SUSPENDED'
                },
                providers: [{
                    nameAlias: 'emily'
                }],
                id: 2
            }, {
                latestJob: {},
                providers: [{
                    nameAlias: 'emily'
                }],
                id: 3
            }, {
                latestJob: {
                    jobStatus: 'ERROR_'
                },
                providers: [{
                    nameAlias: 'emily'
                }],
                id: 4
            }, {
                latestJob: {
                    jobStatus: 'SCHEDULED'
                },
                providers: [{
                    nameAlias: 'emily'
                }],
                id: 5
            }, {
                latestJob: {
                    jobStatus: 'SUBMITTED'
                },
                providers: [{
                    nameAlias: 'emily'
                }],
                id: 6
            }, {
                latestJob: {
                    jobStatus: 'SILLY'
                },
                providers: [{
                    nameAlias: 'emily'
                }],
                id: 7
            }, {
                latestJob: {
                    jobStatus: 'ERROR_USER_AUTH'
                },
                providers: [{
                    nameAlias: 'emily'
                }],
                id: 8
            }, {
                latestJob: {
                    jobStatus: 'ERROR_NEEDS_USER_INTERACTION'
                },
                providers: [{
                    nameAlias: 'emily'
                }],
                id: 9
            }];

            possiblePortals = [{
                status: 'ACTIVE'
            }, {
                status: 'SUSPENDED'
            }, {
                status: 'NULL'
            }, {
                status: 'IN_DEV'
            }, {
                status: 'RANDOM'
            }];
        });

        it('should expect connection to be successful', function() {
            var portalExtend = mfUtils.getExtendedPortal(possiblePortals[0]);
            var connectionExtend = mfUtils.extendConnection(possibleConnections[0], portalExtend);
            var connectionText = mfUtils.getConnectionStatusText(connectionExtend);
            connectionExtend.connectionHasCompleted();

            expect(connectionExtend.associatedPortal).toBeDefined();
            expect(portalExtend.isActive()).toBe(true);
            expect(portalExtend.isConnectable()).toBe(true);
            expect(connectionText).toEqual('Successfully linked and receiving data.');
            expect(connectionExtend._hasEverSucceeded).toBe(true);
        });

        it('should expect connection status to be suspended', function() {
            var portalExtend = mfUtils.getExtendedPortal(possiblePortals[1]);
            var connectionExtend = mfUtils.extendConnection(possibleConnections[1], portalExtend);
            var connectionText = mfUtils.getConnectionStatusText(connectionExtend);

            expect(connectionExtend.hasAnyError()).toBe(false);
            expect(connectionText).toEqual('This provider is experiencing connection issues. We\'ll fetch your data once that\'s fixed.');
        });

        it('should expect connection status to be under development', function() {
            var portalExtend = mfUtils.getExtendedPortal(possiblePortals[3]);
            var connectionExtend = mfUtils.extendConnection(possibleConnections[2], portalExtend);
            var connectionText = mfUtils.getConnectionStatusText(connectionExtend);

            expect(connectionExtend.associatedPortal).toBeDefined();
            expect(connectionText).toEqual('We\'re adding support for this provider. We\'ll fetch your data once this provider is added.');
        });

        it('should expect connection to have some portal error', function() {
            var portalExtend = mfUtils.getExtendedPortal(possiblePortals[2]);
            var connectionExtend = mfUtils.extendConnection(possibleConnections[2], portalExtend);
            var connectionText = mfUtils.getConnectionStatusText(connectionExtend);
            var portalExtendNull = mfUtils.getExtendedPortal(possiblePortals[4]);

            expect(connectionText).toEqual('This organization cannot be synced at this time. Please check back later.');
            expect(portalExtendNull.getPortalStatus()).toEqual('NULL');
        });

        it('should expect connection to be refreshing', function() {
            var portalExtend = mfUtils.getExtendedPortal(possiblePortals[0]);
            var connectionScheduled = mfUtils.extendConnection(possibleConnections[4], portalExtend);
            var connectionSubmitted = mfUtils.extendConnection(possibleConnections[5], portalExtend);
            var connectionText = mfUtils.getConnectionStatusText(connectionScheduled);

            expect(connectionScheduled.isRefreshing()).toBe(true);
            expect(connectionSubmitted.isRefreshing()).toBe(true);
            expect(connectionText).toEqual('We\'re currently checking the credentials of this connection.');
        });

        it('should expect connection to have any other error', function() {
            var portalExtend = mfUtils.getExtendedPortal(possiblePortals[0]);
            var connectionError = mfUtils.extendConnection(possibleConnections[3], portalExtend);
            var connectionSilly = mfUtils.extendConnection(possibleConnections[6], portalExtend);
            var connectionNoPortal = mfUtils.extendConnection(possibleConnections[2]);
            var connectionText = mfUtils.getConnectionStatusText(connectionSilly);

            expect(connectionError.hasAnyError()).toBe(true);
            expect(connectionText).toEqual('Unable to sync your account data. Please check back shortly.');
            expect(connectionNoPortal.hasAnyError()).toBe(true);
        });

        it('should return error text', function() {
            var portalExtend = mfUtils.getExtendedPortal(possiblePortals[0]);
            var connectionUserAuth = mfUtils.extendConnection(possibleConnections[7], portalExtend);
            var connectionUserInteraction = mfUtils.extendConnection(possibleConnections[8], portalExtend);
            var userAuthText = mfUtils.getConnectionStatusText(connectionUserAuth);
            var userInteractionText = mfUtils.getConnectionStatusText(connectionUserInteraction);

            expect(userAuthText).toEqual('We can\'t access this connection. Please verify and re-enter your login details.');
            expect(userInteractionText).toEqual('Please log in and accept the organization\'s Terms of Service.');
        });
    });
});
