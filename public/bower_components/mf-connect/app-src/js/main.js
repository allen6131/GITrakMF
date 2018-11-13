var _ = require('lodash');
var $ = require('jquery');
var mfConnectService = require('./mf-connect-service.js');
var mfUtils = require('./mf-utils.js');

(function (window) {

    // MfConnect constructor, doesn't do much now but should initialize variables maybe?
    // idk what should be in this but maybe something?
    function MfConnect() {
        this.api = mfConnectService;
    }

    // make mfConnectService api calls available through MfConnect.prototype.api for SDK use
    MfConnect.prototype.api = mfConnectService;

    MfConnect.prototype.USER_EVENTS = {
        "ON_ERROR": "onError",
        "ON_OPEN_DIALOG": "onOpenDialog",
        "ON_CLOSE_DIALOG": "onCloseDialog",
        "ON_SEARCH_PROVIDER": "onSearchProvider",
        "ON_SELECT_PROVIDER": "onSelectProvider",
        "ON_SELECT_LOCATION": "onSelectLocation",
        "ON_SELECT_PORTAL": "onSelectPortal",
        "ON_CONNECT_PROVIDER": "onConnectProvider",
        "ON_UPDATE_PROVIDER": "onUpdateProvider",
        "ON_REFRESH_PROVIDER": "onRefreshProvider",
        "ON_DELETE_PROVIDER": "onDeleteProvider"
    };

    MfConnect.prototype.launch = function (options) {
        MfConnect.prototype.api.setMfConnectData(options)
            .then(function (userData) {
                MfConnect.prototype.openModal();
            }, function (error) {
                console.log('error setting mfconnectdata');
                console.log(error);
            });
    };

    MfConnect.prototype.invokeProviderDeleteEvent = function (provider, connection) {
        MfConnect.prototype.invokeExistingProviderEvent(MfConnect.prototype.USER_EVENTS.ON_DELETE_PROVIDER, provider, connection);
    };

    MfConnect.prototype.invokeProviderUpdateEvent = function (provider, connection) {
        MfConnect.prototype.invokeExistingProviderEvent(MfConnect.prototype.USER_EVENTS.ON_UPDATE_PROVIDER, provider, connection);
    };

    MfConnect.prototype.invokeProviderRefreshEvent = function (provider, connection) {
        MfConnect.prototype.invokeExistingProviderEvent(MfConnect.prototype.USER_EVENTS.ON_REFRESH_PROVIDER, provider, connection);
    };

    MfConnect.prototype.invokeExistingProviderEvent = function (eventType, provider, connection) {
        var metadata = {"connectionId": connection.id};
        metadata.portalId = connection.portalId;
        metadata.portalType = connection.associatedPortal.getPortalTypeName();
        metadata.portalName = connection.associatedPortal.name;
        metadata.providerName = provider.nameAlias;
        MfConnect.prototype.invokeEventHandler(eventType, metadata);
    };

    MfConnect.prototype.invokeOnErrorHandler = function (error) {
        var metadata = {"error": error};
        MfConnect.prototype.invokeEventHandler(MfConnect.prototype.USER_EVENTS.ON_ERROR, metadata);
    };

    MfConnect.prototype.invokeOnSelectLocation = function (displayName, location) {
        var metadata = {"id": location.locationInfo.id};
        metadata["displayName"] = displayName;
        metadata["address"] = mfUtils.getAddressDisplayName(location.locationInfo.address);
        MfConnect.prototype.invokeEventHandler(MfConnect.prototype.USER_EVENTS.ON_SELECT_LOCATION, metadata);
    };

    MfConnect.prototype.invokeOnSelectPortal = function (portal) {
        var locationHasPortal = undefined !== portal;
        if (!locationHasPortal) {
            var metadata = {"type": "NO_PORTAL", "message": "The selected location is not associated to any portals yet."};
            MfConnect.prototype.invokeEventHandler(MfConnect.prototype.USER_EVENTS.ON_SELECT_PORTAL, metadata);
            return;
        }
        var portalEx = mfUtils.getExtendedPortal(portal);
        if (portalEx.isUnderDevelopment() || portalEx.isPendingPortal()) {
            var metadata = {
                "type": "PLACEHOLDER_PORTAL",
                "message": "The selected location is currently set to a placeholder portal until a formal mapping has been made."
            };
            MfConnect.prototype.invokeEventHandler(MfConnect.prototype.USER_EVENTS.ON_SELECT_PORTAL, metadata);
            return;
        }
        var metadata = {"id": portal.id, "name": portal.name, "type": portal.typeInfo.name};
        MfConnect.prototype.invokeEventHandler(MfConnect.prototype.USER_EVENTS.ON_SELECT_PORTAL, metadata);
    };

    MfConnect.prototype.invokeOnSearchProviderHandler = function (searchInfo) {
        var metadata = {"term": searchInfo.searchTerm, "zipCode": searchInfo.zipCode};
        MfConnect.prototype.invokeEventHandler(MfConnect.prototype.USER_EVENTS.ON_SEARCH_PROVIDER, metadata);
    };

    MfConnect.prototype.invokeOnConnectProviderHandler = function (connection) {
        var metadata = {"connection": connection};
        MfConnect.prototype.invokeEventHandler(MfConnect.prototype.USER_EVENTS.ON_CONNECT_PROVIDER, metadata);
    };

    MfConnect.prototype.invokeOnSelectProviderHandler = function (displayName, selectedItem) {
        var metadata = {"displayName": displayName};
        if (selectedItem[0].address) {
            metadata["address"] = mfUtils.getAddressDisplayName(selectedItem[0].address);
        }
        if (selectedItem[0].provider) {
            metadata["address"] = mfUtils.getProviderDisplayAddress(selectedItem);
            metadata["id"] = selectedItem[0].provider.id;
        }
        else if (selectedItem[0].practice) {
            metadata["id"] = selectedItem[0].practice.id;
            metadata["address"] = mfUtils.getPracticeDisplayAddress(selectedItem);
        }
        else if (selectedItem[0].office) {
            metadata["id"] = selectedItem[0].office.id;
        }
        else if (selectedItem[0].facility) {
            metadata["id"] = selectedItem[0].facility.id;
        }
        MfConnect.prototype.invokeEventHandler(MfConnect.prototype.USER_EVENTS.ON_SELECT_PROVIDER, metadata);
    };

    MfConnect.prototype.invokeEventHandler = function (eventName, metadata) {
        if ("function" === typeof this.api.getMfConnectData()["onEvent"]) {
            metadata = metadata || {};
            metadata.target = this.api;
            this.api.getMfConnectData()["onEvent"](eventName, metadata);
        }
    };
    // close MfConnect modal - remove the entire modal and the overlay
    MfConnect.prototype.close = function () {
        this.overlay.className = this.overlay.className.replace(' connect-open', '');
        this.connectModal.parentNode.removeChild(this.connectModal);
        this.overlay.parentNode.removeChild(this.overlay);
        this.invokeEventHandler(this.USER_EVENTS.ON_CLOSE_DIALOG);
    };

    // open MfConnect modal - build out modal, initialize close event
    MfConnect.prototype.openModal = function () {
        buildOutModal.call(this);
        createConnectionOverviewContent();
        initializeEvents.call(this);
        this.connectModal.style.display = 'block';
        this.overlay.className = this.overlay.className + ' connect-open';
        this.invokeEventHandler(this.USER_EVENTS.ON_OPEN_DIALOG);
    };

    /*
     *  This function builds out the base/outline of the modal
     *  and creates the overlay
     *  It initializes the modal content with the connection overview screen
     */
    function buildOutModal() {

        var docFrag = document.createDocumentFragment();

        // add overlay
        this.overlay = createHtmlElement('div', undefined, 'mf-connect-overlay fade-and-drop');


        docFrag.appendChild(this.overlay);

        // initial modal div
        this.connectModal = createHtmlElement('div', 'medfusion-connect-modal', 'mf-modal modal');

        // modal dialog
        this.modalDialog = createHtmlElement('div', undefined, 'modal-dialog');

        // modal content
        this.modalContent = createHtmlElement('div', undefined, 'modal-content');

        // modal header with back btn and close
        this.modalHeader = createHtmlElement('div', undefined, 'modal-header');

        this.buttonHolder = createHtmlElement('div', 'mfButtonHolder', undefined);

        this.modalClose = createHtmlElement('button', undefined, 'close');
        this.modalClose.type = 'button';
        this.modalClose.innerHTML = '<span class="mf-icon mf-icon__x"></span>';
        this.buttonHolder.appendChild(this.modalClose);

        // modal back button
        this.modalBack = createHtmlElement('a', 'mfConnectBack', 'mf-back-button');
        this.modalBack.style.display = 'none';
        this.buttonHolder.appendChild(this.modalBack);
        // modal back button click block


        this.modalBackClickBlock = createHtmlElement('div', 'mfBtnClickBlock', 'mf-loading__page-blocker');

        this.modalHeader.appendChild(this.modalBackClickBlock);
        this.modalHeader.appendChild(this.buttonHolder);
        this.modalContent.appendChild(this.modalHeader);

        // create click block div
        this.modalClickBlock = createHtmlElement('div', 'mfClickBlock', 'mf-loading__page-blocker');

        this.modalContent.appendChild(this.modalClickBlock);

        // create modal body with connection overview
        // this will be the div that appends/removes children based on the view
        this.modalBody = createHtmlElement('div', 'createConnectionContent', 'modal-body');

        // loading indicator
        this.modalLoading = createHtmlElement('div', 'mfConnectLoading', 'mf-modal-loading');

        this.modalLoading.innerHTML = '<span id="loaderIcon" class="mf-icon"></span>';
        this.modalBody.appendChild(this.modalLoading);
        // error section

        this.modalError = createHtmlElement('p', 'mfConnectError', 'mf-connect-error');

        this.modalError.style.display = 'none';
        this.modalBody.appendChild(this.modalError);
        this.modalContent.appendChild(this.modalBody);

        // footer
        this.modalFooter = createHtmlElement('div', undefined, 'modal-footer');

        this.modalFooter.innerHTML = '<div class="mf-footer-text">Powered by Medfusion</div>';
        this.modalContent.appendChild(this.modalFooter);

        this.modalDialog.appendChild(this.modalContent);
        this.connectModal.appendChild(this.modalDialog);

        // add modal to fragment
        docFrag.appendChild(this.connectModal);

        document.body.appendChild(docFrag);
    }

    /*
     *  Initializes close events for the modal, on the close button and overlay click (overlay click might not work)
     */
    function initializeEvents() {
        if (this.modalClose) {
            this.modalClose.addEventListener('click', this.close.bind(this));
        }
        if (this.overlay) {
            this.overlay.addEventListener('click', this.close.bind(this));
        }
    }

    /*
     *  Display error to user
     *  Right now, the error field is at the top of the modal and we're just adding text to that field
     */
    function displayError(errorText) {
        document.getElementById('mfConnectError').style.display = 'block';
        document.getElementById('mfConnectError').innerHTML = errorText;
        MfConnect.prototype.invokeOnErrorHandler(errorText);
    }

    function createHtmlElement(name, id, className) {
        var elem = document.createElement(name);
        if (id !== undefined) {
            elem.id = id;
        }
        if (className !== undefined) {
            elem.className = className;
        }
        return elem;
    }

    /*
     *  Display loading indicator and click block
     */
    function displayLoading(isLoading) {
        if (isLoading) {
            document.getElementById('loaderIcon').className = document.getElementById('loaderIcon').className + ' mf-icon__loader';
            $('.mf-loading__page-blocker').show();
        } else {
            document.getElementById('loaderIcon').className = 'mf-icon';
            $('.mf-loading__page-blocker').hide();
        }
    }

    /*
     *  This builds out the content for the search form
     *  previousView is the id of the node from the previous view that we will remove from contentHolder
     */
    function goToSearchForConnection(previousView) {
        // hide error when screen first loads
        document.getElementById('mfConnectError').style.display = 'none';
        displayLoading(true);

        var createConnectionSearch = createHtmlElement('div', 'createConnectionSearch', 'create-connection-search');

        // create header
        var header = document.createElement('h1');
        header.innerHTML = 'Find your provider';
        createConnectionSearch.appendChild(header);

        // create form
        var searchForm = createHtmlElement('form', 'directorySearchForm', 'mf-form__group');
        searchForm.name = 'directorySearchForm';

        // innerHtml of form
        var searchFormHtml = '<label class="mf-form__label" for="searchBy">Search by person or place<span class="mf-form__label--required">Required</span></label>' +
            '<input class="mf-form__input--text" type="search" id="searchBy" minlength="2" required><label class="mf-form__error" for="searchBy">Error text</label>' +
            '<label class="mf-form__label" for="searchZip">Zip code<span class="mf-form__label--required">Required</span></label>' +
            '<input class="mf-form__input--text" type="text" id="searchZip" name="searchZip" pattern="\\d*" minlength="5" maxlength="9" required><label class="mf-form__error" for="searchZip">Error text</label>';
        searchForm.innerHTML = searchFormHtml;

        // create search button
        var searchBtn = createHtmlElement('button', 'directorySearchBtn', 'button mf-cta__primary');
        searchBtn.type = 'button';
        searchBtn.innerHTML = 'Search';
        searchBtn.onclick = function () {
            getDirectorySearchResults('createConnectionSearch');
        };
        searchForm.appendChild(searchBtn);
        createConnectionSearch.appendChild(searchForm);

        var healthGradesBrand = createHtmlElement('p', undefined, 'branding--subtle');
        healthGradesBrand.innerHTML = 'Directory powered by Healthgrades';
        createConnectionSearch.appendChild(healthGradesBrand);

        // set the back button
        var button = document.getElementById('mfConnectBack');
        button.style.display = 'block';
        button.innerHTML = '<span class="mf-icon mf-icon__chevron-left--hollow--exact mf-color__action"></span>Back to providers';
        button.onclick = function () {
            createConnectionOverviewContent('createConnectionSearch');
        };
        document.getElementById('mfButtonHolder').className = 'header-bottom-border';

        displayLoading(false);
        // remove previous screen node
        // append new node we created here
        $('#' + previousView).remove();
        document.getElementById('createConnectionContent').appendChild(createConnectionSearch);
    }

    /*
     * checks for searchBy and searchZip, if nothing lets the user know that these are required fields
     * calls mfUtils getDirectorySearchResults which calls the api and returns results separated into practices and providers
     */
    // previousSearchParams is stuff we need to keep track of in order to come back from different views
    // since we are removing and recreating nodes every time we change
    function getDirectorySearchResults(previousView, previousSearchParams) {
        displayLoading(true);
        var searchInfo = {};
        if (!previousSearchParams) {
            searchInfo.searchTerm = document.getElementById('searchBy').value;
            searchInfo.zipCode = document.getElementById('searchZip').value;
        } else {
            // if user goes 'back' to this step, previousSearchParams will be passed in b/c 'searchBy' and 'searchZip' no
            // longer exist since we removed the parent node last time the user came through this step
            // we want to reinitialize searchInfo with just the searchTerm and zipCode. we don't care about anything else in
            // 'previousSearchParams' since from here moving forward the user will make a new selection
            searchInfo.searchTerm = previousSearchParams.searchTerm;
            searchInfo.zipCode = previousSearchParams.zipCode;
        }

        if (searchInfo.searchTerm && searchInfo.zipCode) {
            MfConnect.prototype.invokeOnSearchProviderHandler(searchInfo);
            mfUtils.getDirectorySearchResults(searchInfo.searchTerm, searchInfo.zipCode)
                .then(function (results) {
                    goToSearchResults(previousView, results, searchInfo);
                }, function (error) {
                    displayLoading(false);
                    displayError('Error getting directory search results.');
                });
        } else {
            displayLoading(false);
            displayError('Please enter a search term and zip code.');
        }
    }

    /*
     * this builds out the content for the search results
     * removes previousView node and appends new node created
     * searchResults = results from the search split into practices and providers
     */
    function goToSearchResults(previousView, searchResults, searchInfo) {
        // hide error when screen first loads
        document.getElementById('mfConnectError').style.display = 'none';

        var createConnectionResults = createHtmlElement('div', 'createConnectionResults', 'create-connection-results');

        // header
        var header = document.createElement('h1');
        header.innerHTML = 'Search results';
        createConnectionResults.appendChild(header);

        // only display results if we actually have results to display otherwise, tell the user no results
        if (searchResults.practices.length || searchResults.providers.length) {

            // create list of places
            if (searchResults.practices.length) {
                // group practices by practice vs office vs facility sourceId
                var practices = _.groupBy(searchResults.practices, function (practice) {
                    if (practice.practice) {
                        return practice.practice.sourceId;
                    } else if (practice.office) {
                        return practice.office.sourceId;
                    } else {
                        return practice.facility.sourceId;
                    }
                });

                var placesHeader = createHtmlElement('p', undefined, 'mf-list-header');
                placesHeader.innerHTML = '<span>Places</span>';
                createConnectionResults.appendChild(placesHeader);

                var placesList = createHtmlElement('ul', undefined, 'mf-list--legacy');

                _.forEach(practices, function (practice) {
                    var name = mfUtils.getPracticeDisplayName(practice);
                    var address = mfUtils.getPracticeDisplayAddress(practice);

                    var practiceLi = createHtmlElement('li', undefined, 'mf-list__item mf-list--byline');
                    practiceLi.innerHTML = '<p class="mf-list__element--primary">' + name + '</p><p class="mf-list__element--secondary">' + address + '</p>';
                    practiceLi.onclick = function () {
                        selectSearchResult(name, practice, searchInfo);
                    };
                    placesList.appendChild(practiceLi);
                });
                createConnectionResults.appendChild(placesList);
            }

            // create list of people
            if (searchResults.providers.length) {
                // group providers by provider Id to remove duplicates in the list
                var providers = _.groupBy(searchResults.providers, function (provider) {
                    return provider.provider.sourceId;
                });

                var providersHeader = document.createElement('p');
                providersHeader.className = 'mf-list-header';
                providersHeader.innerHTML = '<span>People</span>';
                createConnectionResults.appendChild(providersHeader);

                var providersList = document.createElement('ul');
                providersList.className = 'mf-list--legacy';

                _.forEach(providers, function (provider) {
                    var displayName = mfUtils.getProviderDisplayName(provider);
                    var displayAddress = mfUtils.getProviderDisplayAddress(provider);

                    var providerLi = document.createElement('li');
                    providerLi.className = 'mf-list__item mf-list--byline';

                    providerLi.innerHTML = '<p class="mf-list__element--primary">' + displayName + '</p><p class="mf-list__element--secondary">' + displayAddress + '</p>';

                    providerLi.onclick = function () {
                        selectSearchResult(displayName, provider, searchInfo);
                    };
                    providersList.appendChild(providerLi);
                });
                createConnectionResults.appendChild(providersList);
            }
        } else {
            // no results
            var noResults = document.createElement('p');
            noResults.innerHTML = 'No results found. Please search again'; // need better message?
            createConnectionResults.appendChild(noResults);
        }

        // set the back button
        var button = document.getElementById('mfConnectBack');
        button.innerHTML = '<span class="mf-icon mf-icon__chevron-left--hollow--exact mf-color__action"></span>Back to search';
        button.onclick = function () {
            goToSearchForConnection('createConnectionResults');
        };

        displayLoading(false);
        $('#' + previousView).remove();
        document.getElementById('createConnectionContent').appendChild(createConnectionResults);
    }

    /*
     *  takes name of the search selection and directory object
     *  when user selects directory object, the next step is either:
     *      - select location if multiple locations
     *      - select portal if multiple portals
     *      - create connection step 2/enter credentials
     */
    function selectSearchResult(searchSelectionName, directoryObj, searchInfo) {
        displayLoading(true);
        MfConnect.prototype.invokeOnSelectProviderHandler(searchSelectionName, directoryObj);

        mfUtils.selectDirectoryObject(directoryObj)
            .then(function (params) {
                params.directoryLocation.searchSelectionName = searchSelectionName;
                params.profileId = mfConnectService.getMfConnectData().profileId;
                params.searchInfo = searchInfo;

                // set the back button
                var backButton = document.getElementById('mfConnectBack');
                backButton.innerHTML = '<span class="mf-icon mf-icon__chevron-left--hollow--exact mf-color__action"></span>Back to search results';

                if (params.nextStep === 'createConnectionSelectLocation') {
                    goToSelectLocation('createConnectionResults', params);
                } else if (params.nextStep === 'createConnectionSelectPortal') {
                    goToSelectPortal('createConnectionResults', params);
                } else if (params.nextStep === 'createConnectionEnterCredentials') {
                    goToEnterCredentials('createConnectionResults', params);
                } else {
                    displayLoading(false);
                    displayError('Error selecting directory object');
                }
            }, function (error) {
                displayLoading(false);
                displayError('Error selecting directory object.');
            });
    }

    /*
     *  builds out the content for user to select location
     *  if the original search selection was a practice or provider with multiple locations
     *  params = {
      *     directoryLocation {
      *         searchSelection: sourceId
      *         searchSelectionType: type
      *         searchSelectionName: name
      *     }
      *     directoryInstance: practice or provider instance
      *     nextStep: 'createConnectionSelectLocation'
      *     profileId: id
      * }
     */
    function goToSelectLocation(previousView, params) {
        // hide error when screen first loads
        document.getElementById('mfConnectError').style.display = 'none';

        var directoryLocations = [];
        var directoryInstance = params.directoryInstance;

        var createConnectionDisambiguate = createHtmlElement('div', 'createConnectionSelectLocation', 'create-connection-select-location');

        // add header
        var header = document.createElement('h1');
        header.innerHTML = 'Select a location';
        createConnectionDisambiguate.appendChild(header);

        // create 1 array with both offices and facilities
        _.forEach(directoryInstance.offices, function (office) {
            directoryLocations.push({locationInfo: office, locationType: 'OFFICE'});
        });

        _.forEach(directoryInstance.facilities, function (facility) {
            directoryLocations.push({locationInfo: facility, locationType: 'FACILITY'});
        });

        var locationList = document.createElement('ul');
        locationList.className = 'mf-list--legacy';

        _.forEach(directoryLocations, function (location) {
            var name = '';
            var locationAddress = location.locationInfo.address;
            if (location.locationInfo.name && location.locationInfo.name !== '') {
                name = location.locationInfo.name;
            } else if (locationAddress.address) {
                name = locationAddress.address + ' Location';
            } else {
                name = locationAddress.city + ', ' + locationAddress.state + ' ' + locationAddress.zipcode + ' Location';
            }
            var address = (locationAddress.address ? locationAddress.address + ', ' : '') + locationAddress.city + ', ' + locationAddress.state + ' ' + locationAddress.zipcode;
            var locationLi = document.createElement('li');
            locationLi.className = 'mf-list__item mf-list--byline';

            locationLi.innerHTML = '<p class="mf-list__element--primary">' + name + '</p><p class="mf-list__element--secondary">' + address + '</p>';

            locationLi.onclick = function () {
                selectDirectoryLocation(location, name, params);
            };
            locationList.appendChild(locationLi);
        });
        createConnectionDisambiguate.appendChild(locationList);

        // set back button function
        document.getElementById('mfConnectBack').onclick = function () {
            getDirectorySearchResults('createConnectionSelectLocation', params.searchInfo);
        };

        displayLoading(false);
        $('#' + previousView).remove();
        document.getElementById('createConnectionContent').appendChild(createConnectionDisambiguate);
    }

    /*
     *  when user selects location, the next step is either:
     *      - select portal if multiple portals
     *      - create connection step 2/enter credentials
     *
     *  location - single location
     */
    function selectDirectoryLocation(location, name, parameters) {
        displayLoading(true);
        MfConnect.prototype.invokeOnSelectLocation(name, location);

        mfUtils.checkForMultiplePortals(location, parameters)
            .then(function (params) {
                params.directoryLocation.directoryLocationName = name;

                if (params.nextStep === 'createConnectionSelectPortal') {
                    goToSelectPortal('createConnectionSelectLocation', params);
                } else if (params.nextStep === 'createConnectionEnterCredentials') {
                    goToEnterCredentials('createConnectionSelectLocation', params);
                } else {
                    displayLoading(false);
                    displayError('Error selecting directory location');
                }
            }, function (error) {
                displayLoading(false);
                displayError('Error selecting directory location.');
            });
    }

    /*
     *  builds out content for user to select portal if selected location has multiple portals
     */
    function goToSelectPortal(previousView, params) {
        // hide error when screen first loads
        document.getElementById('mfConnectError').style.display = 'none';

        var portals = params.portalArray;

        var createConnectionSelectPortal = createHtmlElement('div', 'createConnectionSelectPortal', 'create-connection-select-portal');

        // add header
        var header = document.createElement('h1');
        header.innerHTML = 'Select a portal';
        createConnectionSelectPortal.appendChild(header);

        var portalList = document.createElement('ul');
        portalList.className = 'mf-list--legacy';

        _.forEach(portals, function (portal) {

            var portalLi = createHtmlElement('li', undefined, 'mf-list__item');
            portalLi.innerHTML = '<p class="mf-list__element--primary">' + portal.name + '</p>';

            portalLi.onclick = function () {
                selectPortal(portal, params);
            };
            portalList.appendChild(portalLi);
        });
        createConnectionSelectPortal.appendChild(portalList);

        // set back button
        document.getElementById('mfConnectBack').onclick = function () {
            getDirectorySearchResults('createConnectionSelectPortal', params.searchInfo);
        };

        displayLoading(false);
        $('#' + previousView).remove();
        document.getElementById('createConnectionContent').appendChild(createConnectionSelectPortal);
    }

    /*
     *  when user selects portal, the next step is:
     *      - create connection step 2/enter credentials
     */
    function selectPortal(portal, parameters) {
        var params = parameters;
        params.portal = portal;
        goToEnterCredentials('createConnectionSelectPortal', params);
    }


    function createCredentialsForm(updateCredentialsForm) {

        var usernameId = "connectionCredentials_username";
        var passwordId = "connectionCredentials_password";
        if (updateCredentialsForm) {
            usernameId = 'update_username';
            passwordId = 'update_password';
        }
        var labelUsername = '<label class="mf-form__label" for="' + usernameId + '">Portal username<span class="mf-form__label--required">Required</span></label>';
        var inputUsername = '<input autocomplete="off" readonly onfocus="this.removeAttribute(&quot;readonly&quot;);" class="mf-form__input--text" type="text" id="' + usernameId + '" minlength="2" required>';
        var labelUsernameError = '<label class="mf-form__error" for="' + usernameId + '">Error text</label>';
        var labelPassword = '<label class="mf-form__label" for="' + passwordId + '">Portal password<span class="mf-form__label--required">Required</span></label>';
        var inputPassword = '<input autocomplete="new-password" class="mf-form__input--text" type="password" id="' + passwordId + '" minlength="5" required>';
        var labelPasswordError = '<label class="mf-form__error" for="' + passwordId + '">Error text</label>';
        return labelUsername + inputUsername + labelUsernameError + labelPassword + inputPassword + labelPasswordError;
    }

    /*
     *  Enter credentials to create new connection
     */
    function goToEnterCredentials(previousView, params) {
        // hide error when screen first loads
        document.getElementById('mfConnectError').style.display = 'none';
        displayLoading(true);
        MfConnect.prototype.invokeOnSelectPortal(params.portal);

        var createConnectionEnterCredentials = createHtmlElement('div', 'createConnectionEnterCredentials', 'create-connection-enter-credentials');

        // get initial information before making connection
        mfUtils.initializeStep2Content(params)
            .then(function (initialInformation) {
                // add header
                var mfHeader = document.createElement('div');
                mfHeader.className = 'item mf-itemnew-header';

                // this block of code could be taken out and put into mfUtils
                // if user selected a provider from search display their name as h1
                if (initialInformation.directoryLocation.providers) {
                    var searchSelectionName = document.createElement('h1');
                    searchSelectionName.innerHTML = params.directoryLocation.searchSelectionName;
                    mfHeader.appendChild(searchSelectionName);
                }
                // display practice, office, or facility name as h2
                var directoryLocationName = document.createElement('h2');
                var directoryLocationDisplayName = mfUtils.getDirectoryLocationDisplayName(initialInformation.directoryLocation);
                if (directoryLocationDisplayName !== '') {
                    directoryLocationName.innerHTML = directoryLocationDisplayName;
                    mfHeader.appendChild(directoryLocationName);
                } else {
                    directoryLocationName.innerHTML = params.directoryLocation.searchSelectionName;
                    mfHeader.appendChild(directoryLocationName);
                }

                // display directorLocation address
                var address = initialInformation.directoryLocation.address;
                var addressElement = document.createElement('p');
                addressElement.innerHTML = (address.address ? address.address + ', ' : '') + address.city + ', ' + address.state + ' ' + address.zipcode;
                mfHeader.appendChild(addressElement);

                createConnectionEnterCredentials.appendChild(mfHeader);

                // let the user know more information about the connection at this step
                var secondaryHeader = createHtmlElement('p', undefined, 'connect-secondary-header');
                var html = '';
                // no existing connection (and we have a selectedPortal that is not IN_DEV and is not SUSPENDED)
                if (!initialInformation.existingConnection /*&& (initialInformation.selectedPortal && !initialInformation.selectedPortal.isUnderDevelopment() && !initialInformation.selectedPortal.isSuspended())*/) {
                    html += 'Enter the log in details you use to access this portal. ';
                } else if (initialInformation.existingConnection /*&& !initialInformation.existingProvider*/) {
                    html += 'One or more of your providers use this portal. ';
                }
                // no selectedPortal or selectedPortal that is IN_DEV (placeholder portal)
                if (initialInformation.selectedPortal && initialInformation.selectedPortal.isUnderDevelopment()) {
                    html += 'We\'re adding support for this provider. We\'ll fetch your data once this provider is added.';
                } else if (initialInformation.selectedPortal && initialInformation.selectedPortal.isSuspended()) {
                    html += 'This provider is experiencing connection issues. We\'ll fetch your data once that\'s fixed.';
                }
                secondaryHeader.innerHTML = html;
                createConnectionEnterCredentials.appendChild(secondaryHeader);

                // create form
                var credentialsForm = createHtmlElement('form', 'enterCredentialsForm', 'mf-form__group');
                credentialsForm.setAttribute("autocomplete", "off");
                credentialsForm.name = 'enterCredentialsForm';

                // innerHtml of form
                var credentialsFormHtml = '';
                if ((initialInformation.existingConnection && initialInformation.existingConnection.needsUserAuth()) || !initialInformation.existingConnection) {
                    credentialsFormHtml = createCredentialsForm(false);
                }
                credentialsForm.innerHTML = credentialsFormHtml;

                // create connect button
                var createConnectionBtn = createHtmlElement('button', 'createConnectionBtn', 'button mf-cta__primary');
                createConnectionBtn.type = 'button';
                createConnectionBtn.innerHTML = 'Connect';
                createConnectionBtn.onclick = function () {
                    createNewConnection(params, initialInformation);
                };
                credentialsForm.appendChild(createConnectionBtn);

                createConnectionEnterCredentials.appendChild(credentialsForm);

                // if the location has a portal/selected portal, display that
                if (params.portal) {
                    var portalName = document.createElement('p');
                    portalName.className = 'portal-info';
                    portalName.innerHTML = 'This provider uses ' + params.portal.name + ' for their patient portal.';
                    createConnectionEnterCredentials.appendChild(portalName);
                }

                // set back button
                document.getElementById('mfConnectBack').onclick = function () {
                    getDirectorySearchResults('createConnectionEnterCredentials', params.searchInfo);
                };

                displayLoading(false);
                $('#' + previousView).remove();
                document.getElementById('createConnectionContent').appendChild(createConnectionEnterCredentials);
            }, function (error) {
                // set back button
                // if coming from results
                document.getElementById('mfConnectBack').onclick = function () {
                    getDirectorySearchResults('createConnectionEnterCredentials', params.searchInfo);
                };
                displayLoading(false);
                $('#' + previousView).remove();
                document.getElementById('createConnectionContent').appendChild(createConnectionEnterCredentials);
                displayError('Error loading data.');
            });
    }

    /*
     * create a new connection with the entered information
     */
    function createNewConnection(params, initialInfo) {
        displayLoading(true);

        mfUtils.createNewConnection(initialInfo, params)
            .then(function (connection) {
                MfConnect.prototype.invokeOnConnectProviderHandler(connection);
                if (params.portal && params.portal.status === 'ACTIVE') {
                    var connectionFields = {
                        id: connection.id
                    };
                    // check connection status if it has a portal
                    mfUtils.updateConnection(connectionFields)
                        .then(function (result) {
                            createConnectionOverviewContent('createConnectionEnterCredentials');
                        }, function (error) {
                            createConnectionOverviewContent('createConnectionEnterCredentials');
                        });
                } else {
                    // a portal was created for this connection so just go to connection overview
                    createConnectionOverviewContent('createConnectionEnterCredentials');
                }
            }, function (error) {
                var errorMsg = '';
                if (error.status === 401) {
                    // This is the response code when we *know* the credentials are invalid --
                    // i.e., when they're connecting to a Medfusion portal.
                    errorMsg = 'The username and password you provided were not accepted by this doctor\'s patient portal. Please verify credentials and try again.';
                } else {
                    errorMsg = 'Error creating a new connection.';
                }
                displayLoading(false);
                displayError(errorMsg);
            });
    }

    /*
     *  if provider needs an update, should show edit view with delete button,
     *  otherwise just show update and delete button
     */
    function goToProviderDetails(previousView, provider, connections) {
        // hide error when screen first loads
        document.getElementById('mfConnectError').style.display = 'none';
        displayLoading(true);

        // possible status
        // isCompleted: successfully linked and recieving data
        // needsUserAuth: we can't access this connection. Please verify and re-enter your login details.
        // needsUserInteraction: Please log in and accept the organization's Terms of Service.
        // hasInternalError: Unable to sync your account data. Please check back shortly.
        // hasPortalError: This organization cannot be synced at this time. Please check back later.
        // hasAnyError:
        // isRefreshing: we're currently checking the credentials of this connection.
        // portal.isUnderDevelopment: We're adding support for this provider. We'll fetch your data once this provider is added.
        // portal.isSuspended: This provider is experiencing connection issues. We'll fetch your data once that's fixed.

        var providerDetails = createHtmlElement('div', 'providerDetails', 'provider-details');

        // add header
        var header = document.createElement('h1');
        header.innerHTML = provider.nameAlias;
        providerDetails.appendChild(header);

        // set the back button
        var backButton = document.getElementById('mfConnectBack');
        backButton.style.display = 'block';
        backButton.innerHTML = '<span class="mf-icon mf-icon__chevron-left--hollow--exact mf-color__action"></span>Back to providers';
        backButton.onclick = function () {
            createConnectionOverviewContent('providerDetails');
        };
        document.getElementById('mfButtonHolder').className = 'header-bottom-border';

        var selectedConnection = mfUtils.findConnectionForProvider(provider, connections);

        var status = createHtmlElement('p', 'connectionStatusText', 'connection-status-info');
        status.innerHTML = mfUtils.getConnectionStatusText(selectedConnection);
        providerDetails.appendChild(status);

        // if some error, tell the user something is wrong and show update login form if needed
        // update form
        var updateLoginForm = createHtmlElement('form', 'updateLoginForm', 'mf-form__group');
        updateLoginForm.setAttribute("autocomplete", "off");
        updateLoginForm.name = 'updateLoginForm';
        updateLoginForm.style.display = 'none';
        updateLoginForm.innerHTML = createCredentialsForm(true);

        // update connect button
        var updateConnectionBtn = createHtmlElement('button', 'updateConnectionBtn', 'button mf-cta__primary');
        updateConnectionBtn.type = 'button';
        updateConnectionBtn.innerHTML = 'Update';
        updateConnectionBtn.onclick = function () {
            updateConnection(provider, selectedConnection);
        };
        updateLoginForm.appendChild(updateConnectionBtn);

        // begin button list
        var list = document.createElement('ul');
        list.className = 'mf-list--legacy';

        var updateProviderBtn = document.createElement('li');
        updateProviderBtn.className = 'mf-list__item mf-list__element-left';
        updateProviderBtn.innerHTML = '<span class="mf-icon mf-icon__edit"></span><p class="mf-list__element--primary">Update sign in details</p>';
        updateProviderBtn.onclick = function () {
            document.getElementById('updateLoginForm').style.display = 'block';
            this.style.display = 'none';
        };
        // only show form if update button is clicked or there is an error
        if (selectedConnection.needsUserAuth()) {
            updateLoginForm.style.display = 'block';
            updateProviderBtn.style.display = 'none';
        }
        providerDetails.appendChild(updateLoginForm);
        list.appendChild(updateProviderBtn);

        // only want to allow users to refresh if the portal is ACTIVE
        if (selectedConnection.associatedPortal.status === 'ACTIVE') {
            var refreshConnectionBtn = document.createElement('li');
            refreshConnectionBtn.className = 'mf-list__item mf-list__element-left';
            refreshConnectionBtn.innerHTML = '<span class="mf-icon mf-icon__refresh"></span><p class="mf-list__element--primary">Refresh connection</p>';
            refreshConnectionBtn.onclick = function () {
                refreshConnection(provider, selectedConnection);
            };
            list.appendChild(refreshConnectionBtn);
        }

        var deleteProviderBtn = document.createElement('li');
        deleteProviderBtn.className = 'mf-list__item mf-list__element-left';
        deleteProviderBtn.innerHTML = '<span class="mf-icon mf-icon__x"></span><p class="mf-list__element--primary">Delete this provider</p>';
        deleteProviderBtn.onclick = function () {
            document.getElementById('deleteConfirmationSection').style.display = 'block';
        };
        list.appendChild(deleteProviderBtn);
        providerDetails.appendChild(list);

        var deleteConfirmationSection = createHtmlElement('div', 'deleteConfirmationSection', undefined);

        var deleteConfirmation = document.createElement('p');
        deleteConfirmation.innerHTML = 'Are you sure you want to delete this provider?';
        deleteConfirmationSection.appendChild(deleteConfirmation);

        var confirmDelete = createHtmlElement('button', undefined, 'mf-btn');
        confirmDelete.innerHTML = 'Delete';
        confirmDelete.onclick = function () {
            deleteProviderConnection(provider, selectedConnection);
        };
        confirmDelete.style.display = 'inline-block';
        deleteConfirmationSection.appendChild(confirmDelete);

        var cancelDelete = createHtmlElement('a', undefined, 'mf-cancel-delete');
        cancelDelete.innerHTML = 'Cancel';
        cancelDelete.onclick = function () {
            document.getElementById('deleteConfirmationSection').style.display = 'none';
        };
        deleteConfirmationSection.appendChild(cancelDelete);
        deleteConfirmationSection.style.display = 'none';
        providerDetails.appendChild(deleteConfirmationSection);

        displayLoading(false);
        $('#' + previousView).remove();
        document.getElementById('createConnectionContent').appendChild(providerDetails);

        // visit site??
    }

    function refreshConnection(provider, selectedConnection) {
        displayLoading(true);
        var connectionFields = {
            id: selectedConnection.id
        };
        mfUtils.updateConnection(connectionFields)
            .then(function (connection) {
                MfConnect.prototype.invokeProviderRefreshEvent(provider, connection);
                displayLoading(false);
                var statusText = document.getElementById('connectionStatusText');
                statusText.innerHTML = connection.statusText;
            }, function (error) {
                displayLoading(false);
                displayError('Error updating connection.');
            });
    }

    function updateConnection(provider, existingConnection) {
        var connectionFields = {
            id: existingConnection.id,
            credentials: {
                username: document.getElementById('update_username').value,
                password: document.getElementById('update_password').value
            }
        };

        if (!connectionFields.credentials.username || !connectionFields.credentials.password) {
            displayError('Please enter a username and password.');
            // display error to user
        } else {
            displayLoading(true);
            mfUtils.updateConnection(connectionFields, existingConnection)
                .then(function (connection) {
                    MfConnect.prototype.invokeProviderUpdateEvent(provider, connection);
                    displayLoading(false);
                    var statusText = document.getElementById('connectionStatusText');
                    statusText.innerHTML = connection.statusText;
                    // display success to user?
                    createConnectionOverviewContent('providerDetails');
                }, function (error) {
                    displayLoading(false);
                    displayError('Error updating connection.');
                });
        }
    }

    /*
     *  delete provider and route back to connection overview
     */
    function deleteProviderConnection(provider, connection) {
        displayLoading(true);
        MfConnect.prototype.api.deleteProviderConnection(provider.connectionId, provider.providerId)
            .then(function (response) {
                // go back to connection view wiht message
                MfConnect.prototype.invokeProviderDeleteEvent(provider, connection);
                createConnectionOverviewContent('providerDetails');
            }, function (error) {
                displayLoading(false);
                // display error
                displayError('Error deleting provider.');
            });
    }

    /*
     *  build out connection overview content
     *  mfUtils initialize connection overview returns needed data for the view
     */
    function createConnectionOverviewContent(previousView) {
        // this view we want to hide the previous view first and display the loading indicator
        if (previousView) {
            $('#' + previousView).remove();
        }
        // hide error when screen first loads
        document.getElementById('mfConnectError').style.display = 'none';
        displayLoading(true);

        var connectionOverview = createHtmlElement('div', 'connectionOverview', 'connection-overview');

        // add header
        var header = document.createElement('h1');
        header.innerHTML = 'Your providers';
        connectionOverview.appendChild(header);

        // initializeConnectionOverview
        mfUtils.initializeConnectionOverview()
            .then(function (result) {
                // create list of providers/connections
                var connectionsList = document.createElement('ul');
                connectionsList.className = 'mf-list--legacy';

                var associatedProviders = _.sortBy(result.associatedProviders, 'nameAlias');

                _.forEach(associatedProviders, function (provider) {
                    var providerAddress = mfUtils.getProviderConnectionDisplayAddress(provider);

                    var connectionLi = document.createElement('li');
                    connectionLi.className = 'mf-list__item mf-list--byline';
                    // if connection has error (see above) display to user somehow
                    connectionLi.innerHTML = '';
                    if (provider.connectionStatus === 'ERROR_USER_AUTH' || provider.connectionStatus === 'ERROR_NEEDS_USER_INTERACTION') {
                        connectionLi.innerHTML += '<span class="mf-icon mf-icon__alert mf-list__pull-right"></span>';
                    }
                    connectionLi.innerHTML += '<p class="mf-list__element--primary">' + provider.nameAlias + '</p><p class="mf-list__element--secondary">' + providerAddress + '</p>';

                    // onclick go to provider detail
                    connectionLi.onclick = function () {
                        goToProviderDetails('connectionOverview', provider, result.extendedConnectionList);
                    };
                    connectionsList.appendChild(connectionLi);
                });
                // add new provider btn
                var addNewProvider = document.createElement('li');
                addNewProvider.className = 'mf-list__item mf-list__element-left';
                addNewProvider.innerHTML = '<span class="mf-icon mf-icon__add"></span><p class="mf-list__element--primary">Add a provider</p>';
                addNewProvider.onclick = function () {
                    goToSearchForConnection('connectionOverview');
                };
                connectionsList.appendChild(addNewProvider);
                connectionOverview.appendChild(connectionsList);

                // remove the back button
                document.getElementById('mfConnectBack').style.display = 'none';
                document.getElementById('mfButtonHolder').removeAttribute('class');

                displayLoading(false);
                document.getElementById('createConnectionContent').appendChild(connectionOverview);
            }, function (error) {
                displayLoading(false);
                document.getElementById('createConnectionContent').appendChild(connectionOverview);
                // display error
                displayError('Error loading connections.');
            });

    }

    // list of public variable that map to private function that are used strictly for testing purposes.
    /* test-code */
    MfConnect.prototype._displayError = displayError;
    MfConnect.prototype._goToSearchForConnection = goToSearchForConnection;
    MfConnect.prototype._getDirectorySearchResults = getDirectorySearchResults;
    MfConnect.prototype._goToSearchResults = goToSearchResults;
    MfConnect.prototype._selectSearchResult = selectSearchResult;
    MfConnect.prototype._goToSelectLocation = goToSelectLocation;
    MfConnect.prototype._selectDirectoryLocation = selectDirectoryLocation;
    MfConnect.prototype._goToSelectPortal = goToSelectPortal;
    MfConnect.prototype._selectPortal = selectPortal;
    MfConnect.prototype._goToEnterCredentials = goToEnterCredentials;
    MfConnect.prototype._createNewConnection = createNewConnection;
    MfConnect.prototype._goToProviderDetails = goToProviderDetails;
    MfConnect.prototype._refreshConnection = refreshConnection;
    MfConnect.prototype._updateConnection = updateConnection;
    MfConnect.prototype._deleteProviderConnection = deleteProviderConnection;
    MfConnect.prototype._createConnectionOverviewContent = createConnectionOverviewContent;
    /* end test-code */

    window.MfConnect = MfConnect;
})(window);

(function () {

    'use strict';

    // this line is necessary for initializing MfConnect
    var mfConnect = new MfConnect();

})();
