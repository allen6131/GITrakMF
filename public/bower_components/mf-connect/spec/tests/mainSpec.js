describe('main', function() {
    var main = require('../../app-src/js/main');
    var mfUtils = require('../../app-src/js/mf-utils');
    var MfConnect = window.MfConnect;
    var mfConnect;
    var options;

    beforeEach(function() {
        mfConnect = new MfConnect();

        options = {
            url: 'http://d3-pt-aws01.dev.medfusion.net:8081/api-gateway-proxy/services',
            userUuid: '12311',
            customerUuid: '22233',
            accessToken: 'token123'
        };
    });

    it('should be defined', function() {
        mfConnect.api.setProfileId(12345);

        var profileId = mfConnect.api.getProfileId();

        expect(mfConnect).toBeDefined();
        expect(profileId).toEqual(12345);
    });

    it('should set connectData', function() {
        mfConnect.launch(options);

        //expect(mfConnect.api.setMfConnectData).toHaveBeenCalled();
    });

    describe('when mfConnect modal is open - ', function() {
        var params;
        var directoryObjArray;
        beforeEach(function() {
            mfConnect.openModal();
            params = {
                directoryLocation: {
                    searchSelection: 'practice.mf',
                    searchSelectionType: 'PRACTICE',
                    searchSelectionName: 'Practice 1'
                },
                directoryInstance: {
                    offices: [{
                        name: 'office1',
                        address: {
                            address: '123 street',
                            city: 'Raleigh',
                            state: 'NC',
                            zipcode: '27603'
                        },
                        type: 'OFFICE',
                        sourceId: 'o1.mf'
                    }, {
                        name: 'office2',
                        address: {
                            address: '1 street',
                            city: 'Cary',
                            state: 'NC',
                            zipcode: '27513'
                        },
                        type: 'OFFICE',
                        sourceId: 'o2.mf'
                    }],
                    facilities: [{
                        name: 'facility1',
                        address: {
                            address: '13 address',
                            city: 'Raleigh',
                            state: 'NC',
                            zipcode: '27603'
                        },
                        type: 'FACILITY',
                        sourceId: 'f1.mf'
                    }]
                },
                nextStep: '',
                searchInfo: {
                    searchTerm: 'Raleigh',
                    zipCode: '27603'
                }
            };
            directoryObjArray = [[{
                provider: {
                    sourceId: '123.mf'
                },
                address: {
                    city: 'Raleigh',
                    state: 'NC',
                    zipcode: '27581'
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
        });

        it('should open modal', function() {
            expect(mfConnect.connectModal.style.display).toEqual('block');
        });

        it('should close modal', function() {
            mfConnect.close();
            expect(mfConnect.overlay.className).toEqual('mf-connect-overlay fade-and-drop');
        });

        it('should display error', function() {
            var error = 'Oh no, there was an error!';
            mfConnect._displayError(error);

            var connectError = document.getElementById('mfConnectError');

            expect(connectError.innerHTML).toEqual(error);
        });

        it('should build out search form', function() {
            var previousView = 'connectionOverview';
            mfConnect._goToSearchForConnection(previousView);

            var form = document.getElementById('directorySearchForm');
            var searchBtn = document.getElementById('directorySearchBtn');

            expect(form).toBeDefined();
        });

        it('should get directory search results', function() {
            var previousView = 'createConnectionSearch';
            document.getElementById('searchBy').value = 'Raleigh';
            document.getElementById('searchZip').value = '27603';

            var searchParams = {
                searchTerm: 'Cary',
                zipCode: '12345'
            };
            var emptyParams = {};

            mfConnect._getDirectorySearchResults(previousView);
            mfConnect._getDirectorySearchResults(previousView, searchParams);
            mfConnect._getDirectorySearchResults(previousView, emptyParams);
        });

        it('should build out search results view', function() {
            var previousView = 'createConnectionSearch';
            var searchInfo = {
                searchTerm: 'Raleigh',
                zipCode: '27603'
            };
            var emptyResults = {
                practices: [],
                providers: []
            };
            var results = {
                practices: [{
                    practice: {
                        sourceId: 'p1.mf',
                        name: 'Practice 1'
                    },
                    address: {
                        address: 'address',
                        city: 'Ralz',
                        state: 'NC',
                        zipcode: '27603'
                    }
                }, {
                    office: {
                        sourceId: 'o1.mf',
                        name: 'Office 1'
                    },
                    address: {
                        address: 'address',
                        city: 'Ralz',
                        state: 'NC',
                        zipcode: '27603'
                    }
                }, {
                    facility: {
                        sourceId: 'f1.mf',
                        name: 'Facility 1'
                    },
                    address: {
                        address: 'address',
                        city: 'Ralz',
                        state: 'NC',
                        zipcode: '27603'
                    }
                }],
                providers: [{
                    provider: {
                        sourceId: 'provider1.mf',
                        name: 'Provider'
                    },
                    practice: {},
                    address: {
                        address: 'address',
                        city: 'Ralz',
                        state: 'NC',
                        zipcode: '27603'
                    }
                }, {
                    provider: {
                        sourceId: 'provider1.mf',
                        name: 'Provider'
                    },
                    office: {},
                    address: {
                        address: 'address',
                        city: 'Ralz',
                        state: 'NC',
                        zipcode: '27603'
                    }
                }]
            };

            mfConnect._goToSearchResults(previousView, emptyResults, searchInfo);
            mfConnect._goToSearchResults(previousView, results, searchInfo);
        });

        it('should select directory search result', function() {
            var searchSelectionName = 'Practice Test';
            var directoryObject = directoryObjArray[0];
            var searchInfo = {
                searchTerm: 'Raleigh',
                zipCode: '27603'
            };

            mfConnect._selectSearchResult(searchSelectionName, directoryObject, searchInfo);
        });

        it('should build out select location view', function() {
            params.nextStep = 'createConnectionSelectLocation';
            var previousView = 'createConnectionResults';

            mfConnect._goToSelectLocation(previousView, params);
        });

        it('should select directory location', function() {
            var location = {
                locationType: 'OFFICE',
                locationInfo: {
                    name: 'office 1',
                    address: {},
                    sourceId: 'office.mf'
                }
            };
            var name = 'office 1';
            mfConnect._selectDirectoryLocation(location, name, params);
        });

        it('should build out select portal view', function() {
            var previousView = 'createConnectionSelectLocation';
            params.directoryLocation.directoryLocationName = 'office1';
            params.directoryLocation.directoryLocationType = 'OFFICE';
            params.directoryLocation.directoryLocationId = 'o1.mf';
            params.portalArray = [{
                name: 'Test Portal',
                id: 80
            }, {
                name: 'Dev Portal',
                id: 2
            }];
            params.nextStep = 'createConnectionSelectPortal';

            mfConnect._goToSelectPortal(previousView, params);
        });

        it('should select portal', function() {
            params.directoryLocation.directoryLocationName = 'office1';
            params.directoryLocation.directoryLocationType = 'OFFICE';
            params.directoryLocation.directoryLocationId = 'o1.mf';
            params.portalArray = [{
                name: 'Test Portal',
                id: 80
            }, {
                name: 'Dev Portal',
                id: 2
            }];
            var portal = {
                name: 'Test Portal',
                id: 80
            };
            //mfConnect._selectPortal(portal, params);
        });

        //it('should create new connection', function() {

        //});

        describe('provider detail view', function() {
            var provider, connections, portal, previousView, selectedConnection;
            beforeEach(function() {
                previousView = 'connectionOverview';
                provider = {
                    nameAlias: 'Dr. Jonny Test',
                    connectionId: 13
                };
                connections = [{
                    latestJob: {
                        jobStatus: 'SUCCESS'
                    },
                    providers: [{
                        nameAlias: 'Dr. Jonny Test'
                    }],
                    id: 13
                }];
                portal = {
                    status: 'ACTIVE'
                };
                portal = mfUtils.getExtendedPortal(portal);
                selectedConnection = mfUtils.extendConnection(connections[0], portal);
            });
            it('should build out provider detail view without update credential form', function() {
                connections[0] = mfUtils.extendConnection(connections[0], portal);

                mfConnect._goToProviderDetails(previousView, provider, connections);
            });

            it('should build out provider detail view with update credential form', function() {
                var connectionsError = [{
                    latestJob: {
                        jobStatus: 'ERROR_USER_AUTH'
                    },
                    providers: [{
                        nameAlias: 'Dr. Jonny Test'
                    }],
                    id: 13
                }];
                connectionsError[0] = mfUtils.extendConnection(connectionsError[0], portal);

                mfConnect._goToProviderDetails(previousView, provider, connectionsError);
            });

            it('should refresh connection', function() {
                mfConnect._refreshConnection(selectedConnection);
            });

            it('should update connection if credentials are present', function() {
                document.getElementById('update_username').value = 'miller';
                document.getElementById('update_password').value = 'password';

                mfConnect._updateConnection(provider, selectedConnection);
            });

            it('should not update connection if credentials are not present', function() {
                document.getElementById('update_username').value = '';
                document.getElementById('update_password').value = '';

                mfConnect._updateConnection(provider, selectedConnection);
            });

            it('should delete provider', function() {
                mfConnect._deleteProviderConnection(provider);
            });
        });

        it('should remove previous view', function() {
            var previousView = 'providerDetails';

            mfConnect._createConnectionOverviewContent(previousView);
        });
    });
    
});
