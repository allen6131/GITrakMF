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

    MfConnect.prototype.invokeProviderDeleteEvent = function (connection) {
        MfConnect.prototype.invokeExistingProviderEvent(MfConnect.prototype.USER_EVENTS.ON_DELETE_PROVIDER, connection);
    };

    MfConnect.prototype.invokeProviderUpdateEvent = function (connection) {
        MfConnect.prototype.invokeExistingProviderEvent(MfConnect.prototype.USER_EVENTS.ON_UPDATE_PROVIDER, connection);
    };

    MfConnect.prototype.invokeProviderRefreshEvent = function (connection) {
        MfConnect.prototype.invokeExistingProviderEvent(MfConnect.prototype.USER_EVENTS.ON_REFRESH_PROVIDER, connection);
    };

    MfConnect.prototype.invokeOnSearchPortalHandler = function (searchInfo) {
        var metadata = {"url": searchInfo.primaryUrl};
        MfConnect.prototype.invokeEventHandler(MfConnect.prototype.USER_EVENTS.ON_SEARCH_PROVIDER, metadata);
    };

    MfConnect.prototype.invokeExistingProviderEvent = function (eventType, connection) {
        var metadata = {"connectionId": connection.id};
        metadata.portalId = connection.portalId;
        metadata.portalType = connection.associatedPortal.getPortalTypeName();
        metadata.portalName = connection.associatedPortal.name;
        MfConnect.prototype.invokeEventHandler(eventType, metadata);
    };

    MfConnect.prototype.invokeOnErrorHandler = function (error) {
        var metadata = {"error": error};
        MfConnect.prototype.invokeEventHandler(MfConnect.prototype.USER_EVENTS.ON_ERROR, metadata);
    };

    MfConnect.prototype.invokeOnSelectPortal = function (portal) {
        var locationHasPortal = undefined !== portal;
        if (!locationHasPortal) {
            var metadata = {
                "type": "NO_PORTAL",
                "message": "The selected location is not associated to any portals yet."
            };
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
        var metadata = {'displayName': displayName};
        metadata['address'] = mfUtils.getAddressDisplayName(selectedItem);

        if (selectedItem.providerId) {
            metadata['address'] = mfUtils.getProviderDisplayAddress(selectedItem);
            metadata['id'] = selectedItem.providerId;
        } else if (selectedItem.practiceId) {
            metadata['id'] = selectedItem.practiceId;
            metadata['address'] = mfUtils.getPracticeDisplayAddress(selectedItem);
        } else if (selectedItem.officeId) {
            metadata['id'] = selectedItem.officeId;
        } else if (selectedItem.facilityId) {
            metadata['id'] = selectedItem.facilityId;
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

        if (this.hasPreSelectedPortal()) {
            showPreSelectedPortal(this.api.getMfConnectData()["preSelectedPortal"], 'createConnectionResults', null, true);
        } else {
            createConnectionOverviewContent();
        }
        initializeEvents.call(this);
        this.connectModal.style.display = 'block';
        this.overlay.className = this.overlay.className + ' connect-open';
        this.invokeEventHandler(this.USER_EVENTS.ON_OPEN_DIALOG);
    };

    MfConnect.prototype.hasPreSelectedPortal = function () {
        var portal = this.api.getMfConnectData()["preSelectedPortal"];
        if (portal === undefined) {
            return false;
        }
        if (typeof portal !== "object") {
            return false;
        }
        return portal.hasOwnProperty("portalId");
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

    // addAConnectionValues are things that we need to keep track of while the user
    // navigates through the 'Add a connection' flow. i.e. filter selection, headers and other constants specific to the path, etc.
    var addAConnectionValues = {};

    function setAddAConnectionValues(innerHTML) {
        if (innerHTML === 'Doctor name') {
            addAConnectionValues = {
                filter: 'doctor',
                searchSubHeader: 'Find your doctor',
                searchByLabel: 'Search by doctor name',
                searchByPlaceholderText: 'First and last name',
                selectSubHeader: 'Select your doctor'
            };
        } else if (innerHTML === 'Office name') {
            addAConnectionValues = {
                filter: 'practice',
                searchSubHeader: 'Find your doctor\'s office',
                searchByLabel: 'Search by office name',
                searchByPlaceholderText: 'Name of office',
                selectSubHeader: 'Select office'
            };
        } else if (innerHTML === 'Portal website address') {
            addAConnectionValues = {
                filter: 'portal',
                searchSubHeader: 'Find your portal website',
                searchByLabel: 'Search by website address',
                searchByPlaceholderText: '',
                selectSubHeader: 'Select your portal'
            };
        }
    }

    /*
     *  Display error to user
     *  Right now, the error field is at the top of the modal and we're just adding text to that field
     */
    function displayError(errorText) {
        changeErrorVisibility(true);
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

    function generateViewHeaders(headerTitle, subHeaderTitle, descriptionText) {
        var headerContent = document.createElement('div');

        // header
        var header = document.createElement('h1');
        header.innerHTML = headerTitle;
        headerContent.appendChild(header);

        // sub header
        var subHeader = document.createElement('h2');
        subHeader.innerHTML = subHeaderTitle;
        headerContent.appendChild(subHeader);

        //paragraph
        if (descriptionText) {
            var paragraph = document.createElement('p');
            paragraph.innerHTML = descriptionText;
            headerContent.appendChild(paragraph);
        }

        return headerContent;
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

    function getBackButton(innerHTML) {
        var button = document.getElementById('mfConnectBack');
        button.style.display = 'block';
        button.innerHTML = '<span class="mf-icon mf-icon__chevron-left--hollow--exact mf-color__action"></span>' + innerHTML;
        return button;
    }

    function generateSearchForm() {
        // innerHtml of form
        if (addAConnectionValues.filter === 'portal') {
            return '<label class="mf-form__label" for="primaryUrl">' + addAConnectionValues.searchByLabel + '<span class="mf-form__label--required">Required</span></label>' +
                '<input class="mf-form__input--text" type="search" id="primaryUrl" minlength="1" required placeholder="' + addAConnectionValues.searchByPlaceholderText + '"><label class="mf-form__error" for="primaryUrl">Error text</label>' +
                '<input class="mf-form__input--text hidden">';
        } else {
            return '<label class="mf-form__label" for="searchBy">' + addAConnectionValues.searchByLabel + '<span class="mf-form__label--required">Required</span></label>' +
                '<input class="mf-form__input--text" type="search" id="searchBy" minlength="2" required placeholder="' + addAConnectionValues.searchByPlaceholderText + '"><label class="mf-form__error" for="searchBy">Error text</label>' +
                '<label class="mf-form__label" for="searchZip">Near zip code<span class="mf-form__label--required">Required</span></label>' +
                '<input class="mf-form__input--text" type="text" id="searchZip" name="searchZip" pattern="\\d*" minlength="5" maxlength="9" required><label class="mf-form__error" for="searchZip">Error text</label>';
        }
    }

    function getPortalSearchResults(previousView, previousSearchParams) {
        displayLoading(true);
        var searchInfo = {};
        if (!previousSearchParams) {
            searchInfo.primaryUrl = document.getElementById('primaryUrl').value;
        } else {
            // if user goes 'back' to this step, previousSearchParams will be passed in b/c 'primaryUrl' no
            // longer exist since we removed the parent node last time the user came through this step
            // we want to reinitialize searchInfo with just the primaryUrl. we don't care about anything else in
            // 'previousSearchParams' since from here moving forward the user will make a new selection
            searchInfo.primaryUrl = previousSearchParams.primaryUrl;
        }
        if (searchInfo.primaryUrl) {
            MfConnect.prototype.invokeOnSearchPortalHandler(searchInfo);
            mfUtils.fetchPortalsByUrl(searchInfo.primaryUrl)
                .then(function (results) {
                    goToSearchResults(previousView, results, searchInfo);
                }, function (error) {
                    displayLoading(false);
                    displayError('Error getting portal search results.');
                });
        } else {
            displayLoading(false);
            displayError('Please enter a portal website address.');
        }
    }

    function showFindProviderView(previousView) {
        var createConnectionSearch = createHtmlElement('div', 'createConnectionSearch', 'create-connection-search');

        // header
        var headerContent = generateViewHeaders('Add a connection', addAConnectionValues.searchSubHeader, null);
        createConnectionSearch.appendChild(headerContent);

        // create form
        var searchForm = createHtmlElement('form', 'directorySearchForm', 'mf-form__group');
        searchForm.name = 'directorySearchForm';
        searchForm.innerHTML = generateSearchForm();

        // create search button
        var searchBtn = createHtmlElement('button', 'directorySearchBtn', 'button mf-cta__primary');
        searchBtn.type = 'button';
        searchBtn.innerHTML = 'Search';
        searchBtn.onclick = function () {
            if (addAConnectionValues.filter === 'portal') {
                getPortalSearchResults('createConnectionSearch', undefined);
            } else {
                getDirectorySearchResults('createConnectionSearch', undefined);
            }
        };
        searchForm.appendChild(searchBtn);
        createConnectionSearch.appendChild(searchForm);

        if (addAConnectionValues.filter === 'practice' || addAConnectionValues.filter === 'doctor') {
            var healthGradesBrand = createHtmlElement('p', undefined, 'branding--subtle');
            healthGradesBrand.innerHTML = 'Directory powered by Healthgrades';
            createConnectionSearch.appendChild(healthGradesBrand);
        }

        var button = getBackButton('Back');
        button.onclick = function () {
            goToSearchForConnection('createConnectionSearch');
        };
        displayLoading(false);
        // remove previous screen node
        // append new node we created here
        removePreviousView(previousView);
        document.getElementById('createConnectionContent').appendChild(createConnectionSearch);
    }

    function createFilterButtonId(id, innerHTML) {
        var button = createHtmlElement('button', id, 'button mf-btn__connect mf-btn');
        button.type = 'button';
        button.innerHTML = innerHTML;
        return button;
    }

    function showFindById(previousView, recommendedPortals) {
        // reset addAConnectionValues whenever the user gets to this screen
        addAConnectionValues = {};

        var createFindById = createHtmlElement('div', 'createFindById', 'create-find-by-id');

        //header
        var headerContent = generateViewHeaders('Add a connection', 'Select a search option', 'Search for your patient portal using one of the following options.');
        createFindById.appendChild(headerContent);

        //filter buttons
        var mfPracticeBtn = createFilterButtonId('mfPracticeBtn', 'Office name');
        mfPracticeBtn.onclick = function () {
            setAddAConnectionValues('Office name');
            showFindProviderView('createFindById');
        };
        createFindById.appendChild(mfPracticeBtn);

        var mfDoctorBtn = createFilterButtonId('mfDoctorBtn', 'Doctor name');
        mfDoctorBtn.onclick = function () {
            setAddAConnectionValues('Doctor name');
            showFindProviderView('createFindById');
        };
        createFindById.appendChild(mfDoctorBtn);

        var mfPortalBtn = createFilterButtonId('mfPortalBtn', 'Portal website address');
        mfPortalBtn.onclick = function () {
            setAddAConnectionValues('Portal website address');
            showFindProviderView('createFindById');
        };
        createFindById.appendChild(mfPortalBtn);

        var bckButton = getBackButton('Back to connections');
        bckButton.onclick = function () {
            createConnectionOverviewContent('createFindById');
        };
        document.getElementById('mfButtonHolder').className = 'header-bottom-border';


        displayLoading(false);
        removePreviousView(previousView);
        document.getElementById('createConnectionContent').appendChild(createFindById);

        showRecommendedPortals(recommendedPortals);
    }

    /*
         *  This builds out the content for the search form
         *  previousView is the id of the node from the previous view that we will remove from contentHolder
         */
    function goToSearchForConnection(previousView) {
        // hide error when screen first loads
        changeErrorVisibility(false);
        displayLoading(true);

        var successHandler = function (recommendedPortals) {
            showFindById(previousView, recommendedPortals);
        };

        var errorHandler = function (error) {
            showRecommendedPortalsError();
        };
        mfUtils.findRecommendedPortalsListData().then(successHandler, errorHandler);
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
            mfUtils.findDirectoryLocations(searchInfo.searchTerm, searchInfo.zipCode)
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

    function createSearchResultItem(name, address, clickFunction) {
        var practiceLi = createHtmlElement('li', undefined, 'mf-list__item mf-list--byline');
        practiceLi.innerHTML = '<span class="mf-icon mf-icon__chevron-right--hollow--exact--large mf-list__pull-right mf-color__dim"></span>' +
            '<p class="mf-list__element--primary">' + name + '</p>' +
            '<p class="mf-list__element--secondary">' + address + '</p>';
        practiceLi.onclick = clickFunction;
        return practiceLi;
    }

    function createPortalSearchResultItem(name, address, clickFunction) {
        var portalLi = createHtmlElement('li', undefined, 'mf-list__item mf-list__element-left mf-list--byline');
        portalLi.innerHTML = '<span class="mf-icon mf-icon__connections"></span>' +
            '<span class="mf-icon mf-icon__chevron-right--hollow--exact--large mf-list__pull-right mf-color__dim"></span>' +
            '<p class="mf-list__element--primary">' + name + '</p>' +
            '<p class="mf-list__element--secondary-padding">' + address + '</p>';
        portalLi.onclick = clickFunction;
        return portalLi;
    }

    function createPlacesListFromPractices(searchResults, createConnectionResults, searchInfo) {
        var placesHeader = createHtmlElement('h3', null, 'mf-list-header--small');
        placesHeader.innerHTML = '<span>' + searchResults.practices.length + ' Results: ' + searchInfo.searchTerm + '</span>';
        createConnectionResults.appendChild(placesHeader);

        var placesList = createHtmlElement('ul', null, 'mf-list--legacy');

        _.forEach(searchResults.practices, function (practice) {
            var name = mfUtils.getPracticeDisplayName(practice);
            var address = mfUtils.getPracticeDisplayAddress(practice);
            var practiceLi = createSearchResultItem(name, address, function () {
                directorySearchResultClick(name, practice, searchInfo);
            });
            placesList.appendChild(practiceLi);
        });
        createConnectionResults.appendChild(placesList);
    }

    function createPeopleList(searchResults, createConnectionResults, searchInfo) {
        var providersHeader = createHtmlElement('h3', null, 'mf-list-header--small');
        providersHeader.innerHTML = '<span>' + searchResults.providers.length + ' Results: ' + searchInfo.searchTerm + '</span>';
        createConnectionResults.appendChild(providersHeader);

        var providersList = createHtmlElement('ul', null, 'mf-list--legacy');

        _.forEach(searchResults.providers, function (provider) {
            var displayName = mfUtils.getProviderDisplayName(provider);
            var displayAddress = mfUtils.getProviderDisplayAddress(provider);
            var providerLi = createSearchResultItem(displayName, displayAddress, function () {
                directorySearchResultClick(displayName, provider, searchInfo);
            });
            providersList.appendChild(providerLi);
        });
        createConnectionResults.appendChild(providersList);
    }

    function createPortalList(searchResults, createConnectionResults, searchInfo) {
        var portalsHeader = createHtmlElement('h3', undefined, 'mf-list-header--small');
        portalsHeader.innerHTML = '<span>' + searchResults.portals.length + ' Results: ' + searchInfo.primaryUrl + '</span>';
        createConnectionResults.appendChild(portalsHeader);

        var portalsList = createHtmlElement('ul', undefined, 'mf-list--legacy');
        _.forEach(searchResults.portals, function (portal) {
            var displayName = portal.name;
            var portalUrl = portal.primaryUrl;
            var portalsLi = createPortalSearchResultItem(displayName, portalUrl, function () {
                portalSearchResultClick(portal, searchInfo);
            });
            portalsList.appendChild(portalsLi);
        });
        createConnectionResults.appendChild(portalsList);

        if (searchResults.portals.length === 0) {
	        var noResultsForPortalSearch = document.createElement('p');
	        noResultsForPortalSearch.innerHTML = 'Your search may have been too specific, try shortening the website address i.e. \'dukemychart.org\'';
	        createConnectionResults.appendChild(noResultsForPortalSearch);
        }
    }

    /*
     * this builds out the content for the search results
     * removes previousView node and appends new node created
     * searchResults = results from the search split into practices and providers
     */
    function goToSearchResults(previousView, searchResults, searchInfo) {
        // hide error when screen first loads
        changeErrorVisibility(false);

        var createConnectionResults = createHtmlElement('div', 'createConnectionResults', 'create-connection-results');

        // header
        var headerContent = generateViewHeaders('Add a connection', addAConnectionValues.selectSubHeader, null);
        createConnectionResults.appendChild(headerContent);
        // only display results if we actually have results to display and if the results match
        // the search criteria otherwise, tell the user no results
        if (addAConnectionValues.filter === 'practice' && searchResults.practices && searchResults.practices.length) {
            createPlacesListFromPractices(searchResults, createConnectionResults, searchInfo);
        } else if (addAConnectionValues.filter === 'doctor' && searchResults.providers && searchResults.providers.length) {
            createPeopleList(searchResults, createConnectionResults, searchInfo);
        } else if (addAConnectionValues.filter === 'portal' && searchResults.portals) {
            createPortalList(searchResults, createConnectionResults, searchInfo);
        } else {
            // no results
            var noResults = document.createElement('p');
            noResults.innerHTML = 'No results found. Please search again';
            createConnectionResults.appendChild(noResults);
        }

        // set the back button
        var button = getBackButton('Back to search');
        button.onclick = function () {
            showFindProviderView('createConnectionResults', null);
        };

        displayLoading(false);
        removePreviousView(previousView);
        document.getElementById('createConnectionContent').appendChild(createConnectionResults);
    }

    /*
     *  takes name of the search selection and directory object
     *  when user selects directory object, the next step is either:
     *      - select location if multiple locations
     *      - select portal if multiple portals
     *      - create connection step 2/enter credentials
     */
    function directorySearchResultClick(searchSelectionName, directoryObj, searchInfo) {
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

                if (params.nextStep === 'createConnectionSelectPortal') {
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

    function portalSearchResultClick(portal, searchInfo) {
        var params = {
            portal: portal,
            profileId: mfConnectService.getMfConnectData().profileId,
            searchInfo: searchInfo
        };

        // set the back button
        var backButton = document.getElementById('mfConnectBack');
        backButton.innerHTML = '<span class="mf-icon mf-icon__chevron-left--hollow--exact mf-color__action"></span>Back to search results';

        goToEnterCredentials('createConnectionResults', params, null, true);
    }

    /*
     *  builds out content for user to select portal if selected location has multiple portals
     */
    function goToSelectPortal(previousView, params) {
        // hide error when screen first loads
        changeErrorVisibility(false);

        var portals = params.portalArray;

        var createConnectionSelectPortal = createHtmlElement('div', 'createConnectionSelectPortal', 'create-connection-select-portal');

        var headerContent = generateViewHeaders('Add a connection', "Confirm your doctor's portal", "There are multiple portals associated with this doctor. Which one are you looking for?");
        createConnectionSelectPortal.appendChild(headerContent);

        var portalList = document.createElement('ul');
        portalList.className = 'mf-list--legacy';

        _.forEach(portals, function (portal) {
            var portalLi = createHtmlElement('li', undefined, 'mf-list__item mf-list__element-left mf-list--byline');
            portalLi.innerHTML = '<span class="mf-icon mf-icon__connections"></span>' +
                '<span class="mf-icon mf-icon__chevron-right--hollow--exact--large mf-list__pull-right mf-color__dim"></span>' +
                '<p class="mf-list__element--primary">' + portal.name + '</p>' +
                '<p class="mf-list__element--secondary-padding">' + portal.primaryUrl + '</p>';
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
        removePreviousView(previousView);
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
        var privacyStatement = '<div><span class="mf-icon mf-icon__privacy"></span><p class="privacy-statement">We take your privacy seriously</p></div>';
        return labelUsername + inputUsername + labelUsernameError + labelPassword + inputPassword + labelPasswordError + privacyStatement;
    }

    function createPortalDescriptionHeader(viewParams, params) {
        // let the user know more information about the connection at this step
        var html = '';
        var name;
        if (viewParams.selectedPortal && viewParams.selectedPortal.name) {
            name = viewParams.selectedPortal.name;
        } else {
            name = params.directoryLocation.searchSelectionName;
        }
        // no existing connection (and we have a selectedPortal that is not IN_DEV and is not SUSPENDED)
        if (!mfUtils.hasSuccessfulExistingConnection(viewParams)) {
            if (viewParams.selectedPortal && viewParams.selectedPortal.name) {
                html += 'Enter your username and password used when logging into ' + name + ' portal.';
            } else {
                html += 'Enter your username and password used when logging into the patient portal for ' + name + '.';
            }
        } else if (viewParams.existingConnection) {
            html += "You have already connected to " + name + ". Please click 'Connect' to continue.";
        }
        // no selectedPortal or selectedPortal that is IN_DEV (placeholder portal)
        if (viewParams.selectedPortal && viewParams.selectedPortal.isUnderDevelopment()) {
            html += ' We\'re adding support for this provider\'s portal. We\'ll fetch your data once this portal is added.';
        } else if (viewParams.selectedPortal && viewParams.selectedPortal.isSuspended()) {
            html += ' This portal is experiencing connection issues. We\'ll fetch your data once that\'s fixed.';
        } else if (viewParams.selectedPortal && viewParams.selectedPortal.isInactive()) {
            html += ' This portal is no longer active. We will not be able to fetch your health data from it.';
        }
        return html;
    }

    function createPortalCredentialsView(divView, viewParams, params, previousView) {
        var headerContent = generateViewHeaders('Add a connection', 'Create portal connection', createPortalDescriptionHeader(viewParams, params));

        divView.appendChild(headerContent);

        // create form
        var credentialsForm = createHtmlElement('form', 'enterCredentialsForm', 'mf-form__group');
        credentialsForm.setAttribute('autocomplete', 'off');
        credentialsForm.name = 'enterCredentialsForm';

        var credentialsFormHtml = '';
        if (!mfUtils.hasSuccessfulExistingConnection(viewParams)) {
            credentialsFormHtml = createCredentialsForm(false);
        }
        credentialsForm.innerHTML = credentialsFormHtml;

        // create connect button
        var createConnectionBtn = createHtmlElement('button', 'createConnectionBtn', 'button mf-cta__primary');
        createConnectionBtn.type = 'button';
        createConnectionBtn.innerHTML = 'Connect';
        createConnectionBtn.onclick = function () {
            createNewConnection('createConnectionEnterCredentials', params, viewParams);
        };

        credentialsForm.appendChild(createConnectionBtn);
        divView.appendChild(credentialsForm);

        // set back button
        document.getElementById('mfConnectBack').onclick = function () {
            if (params.portalArray) {
                goToSelectPortal('createConnectionEnterCredentials', params);
            } else if (addAConnectionValues.filter === 'portal') {
                getPortalSearchResults('createConnectionEnterCredentials', params.searchInfo);
            } else {
                getDirectorySearchResults('createConnectionEnterCredentials', params.searchInfo);
            }
        };

        displayLoading(false);
        removePreviousView(previousView);
        document.getElementById('createConnectionContent').appendChild(divView);
    }

    function goToEnterCredentials(previousView, params, onSuccess) {
        // hide error when screen first loads
        changeErrorVisibility(false);
        displayLoading(true);
        MfConnect.prototype.invokeOnSelectPortal(params.portal);

        var divView = createHtmlElement('div', 'createConnectionEnterCredentials', 'create-connection-enter-credentials');
        var errorHandler = function (error) {
            // set back button
            // if coming from results
            document.getElementById('mfConnectBack').onclick = function () {
                if (addAConnectionValues.filter === 'portal') {
                    getPortalSearchResults('createConnectionEnterCredentials', params.searchInfo);
                } else {
                    getDirectorySearchResults('createConnectionEnterCredentials', params.searchInfo);
                }

            };
            displayLoading(false);
            removePreviousView(previousView);
            document.getElementById('createConnectionContent').appendChild(divView);
            displayError('Error loading data.');
        };
        var successHandler = function (viewParams) {
            createPortalCredentialsView(divView, viewParams, params, previousView);
            if (onSuccess) {
                onSuccess();
            }
        };
        mfUtils.initializeStep2Content(params).then(successHandler, errorHandler);
    }

    /*
     * create a new connection with the entered information
     */

    function createNewConnection(previousView, params, initialInfo) {
        //initial info has existing connection
        var connectionFields = {};
        var successfulExistingConnection = mfUtils.hasSuccessfulExistingConnection(initialInfo);

        if (!successfulExistingConnection) {
            connectionFields = {
                credentials: {
                    username: document.getElementById('connectionCredentials_username').value,
                    password: document.getElementById('connectionCredentials_password').value
                }
            };
        }

        if ((connectionFields.credentials && (!connectionFields.credentials.username || !connectionFields.credentials.password))) {
            displayError('Please enter a username and password.');
            // display error to user
        } else {
            displayLoading(true);
            mfUtils.createNewConnection(initialInfo, params)
                .then(function (connection) {
                    MfConnect.prototype.invokeOnConnectProviderHandler(connection);
                    // portal is not active so go directly to overview
                    if (!params.portal || !params.portal.isActive()) {
                        createConnectionOverviewContent('createConnectionEnterCredentials');
                    } else {
                        goToValidatingCredentials(previousView, connection, params.portal.name);
                    }
                }, function (error) {
                    var errorMsg = '';
                    if (error.status === 401) {
                        // This is the response code when we *know* the credentials are invalid --
                        // i.e., when they're connecting to a Medfusion portal.
                        errorMsg = 'The username and password you provided were not accepted by this doctor\'s patient portal. Please verify credentials and try again.';
                    } else {
                        errorMsg = 'There was an error creating a new connection. Please verify that your username and password are correct.';
                    }
                    displayLoading(false);
                    displayError(errorMsg);
                });
        }
    }

    function goToValidatingCredentials(previousView, connection, portalName) {
        changeErrorVisibility(false);
        displayLoading(true);

        var validatingCredentials = createHtmlElement('div', 'validatingCredentials', 'validating-credentials center-text');

        var validatingIcon = createHtmlElement('span', null, 'mf-icon mf-icon__validating-credentials');
        validatingCredentials.appendChild(validatingIcon);

        var header = createHtmlElement('h2', null, null);
        header.innerHTML = 'Validating credentials...';
        validatingCredentials.appendChild(header);

        var description = createHtmlElement('p', null, null);
        description.innerHTML = 'Please wait for us to validate your credentials before closing this window.';
        validatingCredentials.appendChild(description);

        var newConnection = createHtmlElement('ul', null, 'mf-list--legacy');

        var newConnectionItem = createHtmlElement('li', null, 'mf-list__item mf-list--byline');
        newConnectionItem.innerHTML = '<span class="mf-icon mf-icon__refreshing-green mf-list__pull-right"></span>' +
            '<p class="mf-list__element--primary">' + portalName + '</p>' +
            '<p class="mf-list__element--secondary">Validating credentials...</p>';

        newConnection.appendChild(newConnectionItem);
        validatingCredentials.appendChild(newConnection);

        var waitText = createHtmlElement('p', null, 'validating-creds-text');
        waitText.innerHTML = 'This may take a few minutes';
        validatingCredentials.appendChild(waitText);

        // if the credential check lasts 5 minutes, return to the connection management page
        var timeout = window.setTimeout(function () {
            window.clearTimeout(timeout);
	        window.clearInterval(interval);
            createConnectionOverviewContent('validatingCredentials');
        }, 180000);

        // check to see if the credentials were valid or invalid
        var interval = window.setInterval(function () {
            mfUtils.findConnectionById(connection)
                .then(function (extendedConnection) {
                    if (extendedConnection.hasEverBeenSuccessful()) {
                        window.clearInterval(interval);
                        window.clearTimeout(timeout);
                        goToSuccessfullyConnected('validatingCredentials', extendedConnection, portalName);
                    } else if (!extendedConnection.hasEverBeenSuccessful() && !extendedConnection.isRetrieving() && extendedConnection.errorNeedsUserAuth()) {
                        window.clearInterval(interval);
                        window.clearTimeout(timeout);
                        goToConnectionDetails('validatingCredentials', extendedConnection);
                    } else if (!extendedConnection.hasEverBeenSuccessful() && !extendedConnection.isRetrieving()) {
                        window.clearInterval(interval);
                        window.clearTimeout(timeout);
                        createConnectionOverviewContent('validatingCredentials');
                    }
                });
        }, 15000);

        var backButton = document.getElementById('mfConnectBack');
        backButton.style.display = 'none';
        backButton.innerHTML = '';

        displayLoading(false);
        removePreviousView(previousView);
        document.getElementById('createConnectionContent').appendChild(validatingCredentials);
    }

    function goToSuccessfullyConnected(previousView, connection, portalName) {
        changeErrorVisibility(false);
        displayLoading(true);

        var successfullyConnected = createHtmlElement('div', 'successfullyConnected', 'successfully-connected center-text');

        var successIcon = createHtmlElement('span', null, 'mf-icon mf-icon__connected-successful');
        successfullyConnected.appendChild(successIcon);

        var header = createHtmlElement('h2', null, null);
        header.innerHTML = 'Successfully connected';
        successfullyConnected.appendChild(header);

        var description = createHtmlElement('p', null, null);
        description.innerHTML = 'Thanks for waiting around! We are ready to add more connections.';
        successfullyConnected.appendChild(description);

        var newConnection = createHtmlElement('ul', null, 'mf-list--legacy');

        var newConnectionItem = createHtmlElement('li', null, 'mf-list__item mf-list--byline');
        newConnectionItem.innerHTML = '<span class="mf-icon mf-icon__connected-small mf-list__pull-right"></span>' +
            '<p class="mf-list__element--primary">' + portalName + '</p>' +
            '<p class="mf-list__element--secondary">Connected</p>';

        newConnection.appendChild(newConnectionItem);
        successfullyConnected.appendChild(newConnection);

        var timeout = window.setTimeout(function () {
            window.clearTimeout(timeout);
            createConnectionOverviewContent('successfullyConnected');
        }, 4000);

        displayLoading(false);
        removePreviousView(previousView);
        document.getElementById('createConnectionContent').appendChild(successfullyConnected);
    }

    /*
     *  if provider needs an update, should show edit view with delete button,
     *  otherwise just show update and delete button
     */
    function goToConnectionDetails(previousView, connection) {
        // hide error when screen first loads
        changeErrorVisibility(false);
        displayLoading(true);

        // possible status
        // isConnected: successfully linked and recieving data
        // errorNeedsUserAuth: we can't access this connection. Please verify and re-enter your login details.
        // errorNeedsUserInteraction: Please log in and accept the organization's Terms of Service.
        // hasUnknownError: Unable to sync your account data. Please check back shortly.
        // isRefreshing: we're currently checking the credentials of this connection.
        // isUnderDevelopment: We're adding support for this provider. We'll fetch your data once this provider is added.
        // isSuspended: This provider is experiencing connection issues. We'll fetch your data once that's fixed.
        // isPending: This is a pending portal. We'll fetch your data once this provider is added.

        var connectionDetails = createHtmlElement('div', 'connectionDetails', 'connection-details');

        var bannerStyle = mfUtils.getStatusStyleDetails(connection);

        var gradientStyle = '';
        if (bannerStyle && bannerStyle.gradientStyle) {
            gradientStyle += bannerStyle.gradientStyle;
        }

        var bannerIcon = '';
        if (bannerStyle && bannerStyle.bannerIcon) {
            bannerIcon += bannerStyle.bannerIcon;
        }

        var connectionDetailMessage = '';
        if (bannerStyle && bannerStyle.connectionDetailMessage) {
            connectionDetailMessage += bannerStyle.connectionDetailMessage;
        }

        // add header
        var statusBannerHeader = createHtmlElement('ul', 'connectionStatusHeader', 'mf-list--legacy mf-roofless mf-gradient ' + gradientStyle);

        var statusBannerItem = createHtmlElement('li', null, 'mf-list__item mf-borderless mf-list--byline mf-list__element-left');
        statusBannerItem.innerHTML = '<span class="mf-icon-header ' + bannerIcon + '"></span>' +
            '<p class="mf-list__element--primary-header">Connection status</p>' +
            '<p class="mf-list__element--secondary-header">' + connectionDetailMessage + '</p>';

        statusBannerHeader.appendChild(statusBannerItem);
        connectionDetails.appendChild(statusBannerHeader);

        var header = createHtmlElement('p', null, 'no-margin-bottom small-text');
        header.innerHTML = 'MANAGE PORTAL CONNECTION';
        connectionDetails.appendChild(header);

        var portalNameHeader = document.createElement('h1');
        portalNameHeader.innerHTML = connection.associatedPortal.name;
        connectionDetails.appendChild(portalNameHeader);

        // set the back button
        var backButton = document.getElementById('mfConnectBack');
        backButton.style.display = 'block';
        backButton.innerHTML = '<span class="mf-icon mf-icon__chevron-left--hollow--exact mf-color__action"></span>Back to connections';
        backButton.onclick = function () {
            createConnectionOverviewContent('connectionDetails');
        };
        document.getElementById('mfButtonHolder').className = 'header-bottom-border';

        // begin button list
        var list = createHtmlElement('ul', null, 'mf-list--legacy');

        // refresh connection
        var refreshConnectionItem = createHtmlElement('li', null, 'mf-list__item mf-list--byline mf-list__element-left');
        if (connection.associatedPortal.status === 'ACTIVE' && (connection.isConnected() || connection.hasUnknownError())) {
            refreshConnectionItem.innerHTML = '<span class="mf-icon mf-icon__refresh"></span>' +
                '<button id="mfRefreshButton" class="mf-btn mf-list__pull-right">Go</button>' +
                '<p class="mf-list__element--primary">Refresh connection</p>' +
                '<p class="mf-list__element--secondary">Download new records</p>';
        } else {
            refreshConnectionItem.innerHTML = '<span class="mf-icon mf-icon__refresh mf-color__dim"></span>' +
                '<button id="mfRefreshButton" class="mf-btn mf-list__pull-right" disabled="disabled">Go</button>' +
                '<p class="mf-list__element--primary">Refresh connection</p>' +
                '<p class="mf-list__element--secondary">Download new records</p>';
        }
        list.appendChild(refreshConnectionItem);

        // update connection
        var updateProviderBtn = null;
        if (connection.errorNeedsUserAuth()) {
            updateProviderBtn = createHtmlElement('li', null, 'mf-list__item mf-list--byline mf-list__element-left');
            updateProviderBtn.innerHTML = '<span class="mf-icon mf-icon__edit"></span>' +
                '<span class="mf-icon mf-icon__invalid-small mf-list__pull-right"></span>' +
                '<p class="mf-list__element--primary">Update sign in details</p>' +
                '<p class="mf-list__element--secondary-negative">Update your information</p>';
        } else {
            updateProviderBtn = createHtmlElement('li', null, 'mf-list__item mf-list__element-left');
            updateProviderBtn.innerHTML = '<span class="mf-icon mf-icon__edit"></span>' +
                '<span class="mf-icon mf-icon__chevron-right--hollow--exact--large mf-list__pull-right mf-color__dim"></span>' +
                '<p class="mf-list__element--primary">Update sign in details</p>';
        }

        updateProviderBtn.onclick = function () {
            goToUpdateCredentials('connectionDetails', connection);
        };
        list.appendChild(updateProviderBtn);

        // launch Portal
        if (connection.associatedPortal.status === 'ACTIVE') {
            var launchPortalBtn = null;
            if (connection.errorNeedsUserInteraction() || connection.errorNeedsSecurityQuestions()) {
                launchPortalBtn = createHtmlElement('li', null, 'mf-list__item mf-list--byline mf-list__element-left');
                launchPortalBtn.innerHTML = '<span class="mf-icon mf-icon__connections"></span>' +
                    '<span class="mf-icon mf-icon__invalid-small mf-list__pull-right"></span>' +
                    '<p class="mf-list__element--primary">Launch portal</p>' +
                    '<p class="mf-list__element--secondary-negative">' + bannerStyle.connectionManagementMessage + '</p>';
            } else {
                launchPortalBtn = createHtmlElement('li', null, 'mf-list__item mf-list__element-left');
                launchPortalBtn.innerHTML = '<span class="mf-icon mf-icon__connections"></span>' +
                    '<span class="mf-icon mf-icon__chevron-right--hollow--exact--large mf-list__pull-right mf-color__dim"></span>' +
                    '<p class="mf-list__element--primary">Launch portal</p>';
            }

            launchPortalBtn.onclick = function () {
                goToLaunchPortalView('connectionDetails', connection);
            };

            list.appendChild(launchPortalBtn);
        }

        // delete connection
        var deleteProviderBtn = createHtmlElement('li', null, 'mf-list__item mf-list__element-left');
        deleteProviderBtn.innerHTML = '<span class="mf-icon mf-icon__trash"></span>' +
            '<span class="mf-icon mf-icon__chevron-right--hollow--exact--large mf-list__pull-right mf-color__dim"></span>' +
            '<p class="mf-list__element--primary">Delete this connection</p>';
        deleteProviderBtn.onclick = function () {
            goToDeleteConnection('connectionDetails', connection);
        };
        list.appendChild(deleteProviderBtn);
        connectionDetails.appendChild(list);

        displayLoading(false);
        removePreviousView(previousView);
        document.getElementById('createConnectionContent').appendChild(connectionDetails);

        document.getElementById('mfRefreshButton').onclick = function () {
            refreshConnection(connection);
        };
    }

    function refreshConnection(connection) {
        displayLoading(true);
        mfUtils.updateConnection(connection)
            .then(function (connection) {
                MfConnect.prototype.invokeProviderRefreshEvent(connection);
                displayLoading(false);
            }, function (error) {
                displayLoading(false);
                displayError('Error updating connection.');
            });
    }

    function goToUpdateCredentials(previousView, connection) {
        // hide error when screen first loads
        changeErrorVisibility(false);

        var updateCredentialsView = createHtmlElement('div', 'updateCredentialsView', 'update-credentials');

        // header
        var headerContent = document.createElement('div');

        var header = document.createElement('h1');
        header.innerHTML = 'Update sign in details';
        headerContent.appendChild(header);

        if (connection.errorNeedsUserAuth()) {
            var invalidInfoAlert = createHtmlElement('ul', null, 'mf-list--legacy mf-negative-alert');
            invalidInfoAlert.innerHTML = '<li class="mf-list__item mf-list__element-left">' +
                '<span class="mf-icon mf-icon__invalid-header"></span>' +
                '<p class="mf-list__element--primary-header-negative">Invalid information</p>' +
                '<p class="mf-list__element--secondary-header-negative">Please update your portal username and password</p></li>';
            headerContent.appendChild(invalidInfoAlert);
        }

        var subHeader = document.createElement('h2');
        subHeader.innerHTML = 'Updating your portal connection';
        headerContent.appendChild(subHeader);

        var paragraph = document.createElement('p');
        paragraph.innerHTML = 'Enter your username and password used when logging into ' + connection.associatedPortal.name;
        headerContent.appendChild(paragraph);

        updateCredentialsView.appendChild(headerContent);

        // update credentials form
        var updateLoginForm = createHtmlElement('form', 'updateLoginForm', 'mf-form__group');
        updateLoginForm.setAttribute('autocomplete', 'off');
        updateLoginForm.name = 'updateLoginForm';
        updateLoginForm.innerHTML = createCredentialsForm(true);

        // update credentials submit button
        var updateConnectionBtn = createHtmlElement('button', 'updateConnectionBtn', 'button mf-cta__primary');
        updateConnectionBtn.type = 'button';
        updateConnectionBtn.innerHTML = 'Update';
        updateConnectionBtn.onclick = function () {
            updateConnection(connection);
        };
        updateLoginForm.appendChild(updateConnectionBtn);
        updateCredentialsView.appendChild(updateLoginForm);

        // set the back button
        var backButton = document.getElementById('mfConnectBack');
        backButton.style.display = 'block';
        backButton.innerHTML = '<span class="mf-icon mf-icon__chevron-left--hollow--exact mf-color__action"></span>Back to manage connection';
        backButton.onclick = function () {
            goToConnectionDetails('updateCredentialsView', connection);
        };
        document.getElementById('mfButtonHolder').className = 'header-bottom-border';

        removePreviousView(previousView);
        document.getElementById('createConnectionContent').appendChild(updateCredentialsView);
    }

    function updateConnection(connection) {
        var connectionFields = {
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
            connection.credentials = connectionFields.credentials;
            mfUtils.updateConnection(connection)
                .then(function (connection) {
                    MfConnect.prototype.invokeProviderUpdateEvent(connection);
                    displayLoading(false);
                    goToConnectionDetails('updateCredentialsView', connection);
                }, function (error) {
                    displayLoading(false);
                    displayError('Error updating connection.');
                });
        }
    }

    function goToLaunchPortalView(previousView, connection) {
        // hide error when screen first loads
        changeErrorVisibility(false);

        var launchPortalView = createHtmlElement('div', 'launchPortalView', 'launch-portal center-text');

        // header
        var headerContent = document.createElement('div');

        var portalIcon = createHtmlElement('span', null, 'mf-icon mf-icon__connection-large');
        headerContent.appendChild(portalIcon);

        var header = document.createElement('h2');
        header.innerHTML = 'Log in to your portal to fix your account';
        headerContent.appendChild(header);

        launchPortalView.appendChild(headerContent);

        var selectedConnection = createHtmlElement('ul', null, 'mf-list--legacy mf-roofless inside-border');

        var selectedConnectionItem = createHtmlElement('li', null, 'mf-list__item mf-list--byline mf-borderless-center');
        selectedConnectionItem.innerHTML = '<p class="mf-list__element--primary">' + connection.associatedPortal.name + '</p>' +
            '<p class="mf-list__element--secondary">' + connection.associatedPortal.primaryUrl + '</p>';

        selectedConnection.appendChild(selectedConnectionItem);
        launchPortalView.appendChild(selectedConnection);

        var buttonHeader = createHtmlElement('p', null, 'semibold');
        buttonHeader.innerHTML = 'Return and refresh connection';
        launchPortalView.appendChild(buttonHeader);

        var buttonBreak = createHtmlElement('ul', null, 'mf-list--legacy');
        launchPortalView.appendChild(buttonBreak);

        var cancelBtn = createHtmlElement('button', null, 'mf-btn mf-naked-margin');
        cancelBtn.innerHTML = 'Cancel';
        cancelBtn.onclick = function () {
            goToConnectionDetails('launchPortalView', connection);
        };
        cancelBtn.style.display = 'inline-block';
        launchPortalView.appendChild(cancelBtn);

        var launchPortalBtn = createHtmlElement('button', null, 'mf-btn');
        launchPortalBtn.innerHTML = 'Launch website';
        launchPortalBtn.onclick = function () {
            window.open(connection.associatedPortal.primaryUrl, '_blank');
            goToConnectionDetails('launchPortalView', connection);
        };
        launchPortalBtn.style.display = 'inline-block';
        launchPortalView.appendChild(launchPortalBtn);

        // set the back button
        var backButton = document.getElementById('mfConnectBack');
        backButton.style.display = 'block';
        backButton.innerHTML = '<span class="mf-icon mf-icon__chevron-left--hollow--exact mf-color__action"></span>Back to manage connection';
        backButton.onclick = function () {
            goToConnectionDetails('launchPortalView', connection);
        };
        document.getElementById('mfButtonHolder').className = 'header-bottom-border';

        removePreviousView(previousView);
        document.getElementById('createConnectionContent').appendChild(launchPortalView);
    }

    function goToDeleteConnection(previousView, connection) {
        // hide error when screen first loads
        changeErrorVisibility(false);

        var deleteConfirmationSection = createHtmlElement('div', 'deleteConfirmationSection', 'delete-connection center-text mf-negative-alert-border');

        // header
        var headerContent = document.createElement('div');

        var deleteIcon = createHtmlElement('span', null, 'mf-icon mf-icon__trash-large mf-icon-large-margin');
        headerContent.appendChild(deleteIcon);

        var header = createHtmlElement('h1', null, 'negative');
        header.innerHTML = 'Are you sure you want to delete this connection';
        headerContent.appendChild(header);

        deleteConfirmationSection.appendChild(headerContent);

        var selectedConnection = createHtmlElement('ul', null, 'mf-list--legacy mf-roofless inside-border');

        var selectedConnectionItem = createHtmlElement('li', null, 'mf-list__item mf-list--byline mf-border-negative');
        selectedConnectionItem.innerHTML = '<p class="mf-list__element--primary">' + connection.associatedPortal.name + '</p>' +
            '<p class="mf-list__element--secondary">' + connection.associatedPortal.primaryUrl + '</p>';

        selectedConnection.appendChild(selectedConnectionItem);
        deleteConfirmationSection.appendChild(selectedConnection);

        var confirmDelete = createHtmlElement('button', null, 'mf-btn mf-cta--danger');
        confirmDelete.innerHTML = 'Delete connection';
        confirmDelete.onclick = function () {
            deleteSelectedConnection(connection);
        };
        confirmDelete.style.display = 'inline-block';
        deleteConfirmationSection.appendChild(confirmDelete);

        var cancelDelete = createHtmlElement('button', null, 'mf-btn');
        cancelDelete.innerHTML = 'Cancel';
        cancelDelete.onclick = function () {
            goToConnectionDetails('deleteConfirmationSection', connection);
        };
        cancelDelete.style.display = 'inline-block';
        deleteConfirmationSection.appendChild(cancelDelete);

        // set the back button
        var backButton = document.getElementById('mfConnectBack');
        backButton.style.display = 'block';
        backButton.innerHTML = '<span class="mf-icon mf-icon__chevron-left--hollow--exact mf-color__action"></span>Back to manage connection';
        backButton.onclick = function () {
            goToConnectionDetails('deleteConfirmationSection', connection);
        };
        document.getElementById('mfButtonHolder').className = 'header-bottom-border';

        removePreviousView(previousView);
        document.getElementById('createConnectionContent').appendChild(deleteConfirmationSection);
    }

    /*
     *  delete connection and route back to connection overview
     */
    function deleteSelectedConnection(connection) {
        displayLoading(true);
        MfConnect.prototype.api.deleteConnection(connection.profileId, connection.id)
            .then(function (response) {
                // go back to connection view wiht message
                MfConnect.prototype.invokeProviderDeleteEvent(connection);
                createConnectionOverviewContent('deleteConfirmationSection');
            }, function (error) {
                displayLoading(false);
                // display error
                displayError('Error deleting provider.');
            });
    }

    function showRecommendedPortalsError() {
        displayLoading(false);
        displayError('Error loading recommended portals.');
    }

    function createListOfProvidersErrorHandler(connectionOverview, error) {
        displayLoading(false);
        document.getElementById('createConnectionContent').appendChild(connectionOverview);
        displayError('Error loading connections.');
    }

    function createConnectionItem(connection) {
        var item = createHtmlElement('li', undefined, 'mf-list__item mf-list--byline');

        item.innerHTML = '';

        // show status icon based on connection status
        var styleDetails = mfUtils.getStatusStyleDetails(connection);

        if (styleDetails && styleDetails.managementPageIcon) {
            item.innerHTML += '<span class="mf-icon ' + styleDetails.managementPageIcon + ' mf-list__pull-right"></span>';
        }

        var connectionManagementMessage = '';
        if (styleDetails && styleDetails.connectionManagementMessage) {
            connectionManagementMessage += styleDetails.connectionManagementMessage;
        }

        var connectionManagementSecondaryStyle = '';
        if (styleDetails && styleDetails.connectionManagementSecondaryStyle) {
            connectionManagementSecondaryStyle += styleDetails.connectionManagementSecondaryStyle;
        }

        item.innerHTML += '<p class="mf-list__element--primary mf-list__item-color-brand">' + connection.associatedPortal.name + '</p><p class="' + connectionManagementSecondaryStyle + '">' + connectionManagementMessage + '</p>';

        item.onclick = function () {
            goToConnectionDetails('connectionOverview', connection);
        };
        return item;
    }

    function createListOfProviders(connectionOverview, profileData) {
        var connectionsListHeader = createHtmlElement('h3', null, 'mf-list-header');
        connectionsListHeader.innerHTML = 'Manage your portal connections';

        // create list of providers/connections
        var connectionsList = createHtmlElement('ul', null, 'mf-list--legacy');

        if (profileData.connectionsList.length === 0) {
            var item = createHtmlElement('li', null, 'mf-list__item mf-list__element-left');
            item.innerHTML = '<span class="mf-icon mf-icon__add"></span><p class="mf-list__element--primary">Add a connection</p>';
            item.onclick = function () {
                goToSearchForConnection('connectionOverview');
            };
            connectionsList.appendChild(item);
        } else {
            _.forEach(profileData.connectionsList, function (connection) {
                connectionsList.appendChild(createConnectionItem(connection));
            });
        }

        connectionOverview.appendChild(connectionsListHeader);
        connectionOverview.appendChild(connectionsList);

        // remove the back button
        document.getElementById('mfConnectBack').style.display = 'none';
        document.getElementById('mfButtonHolder').removeAttribute('class');

        displayLoading(false);
        document.getElementById('createConnectionContent').appendChild(connectionOverview);
    }

    function showBackToConnectionsLink(currentView) {
        var button = getBackButton('Skip');
        button.onclick = function () {
            createConnectionOverviewContent(currentView);
        };
    }

    function showBackToFindByIdLink(currentView, recommendedPortals) {
        var button = getBackButton('Back to search options');
        button.onclick = function () {
            showFindById(currentView, recommendedPortals);
        };
    }

    function showPreSelectedPortal(preSelectedPortal, previousView, recommendedPortals, onOpen) {
        displayLoading(true);

        var portalId = preSelectedPortal.portalId;
        var showCredentialsForm = function (portal) {

            var params = {"portal": portal, "profileId": mfConnectService.getProfileId()};
            if (preSelectedPortal.directoryLocation) {
                params["directoryLocation"] = preSelectedPortal.directoryLocation;
            }

            goToEnterCredentials(previousView, params, function () {
                if (onOpen) {
                    showBackToConnectionsLink('createConnectionEnterCredentials', recommendedPortals);
                } else {
                    showBackToFindByIdLink('createConnectionEnterCredentials', recommendedPortals);
                }
            });
        };
        var errorHandler = function (error) {
            if (error.status && error.status === 404) {
                createConnectionOverviewContent();
                return;
            }
            displayLoading(false);
            displayError('Error showing preselected portal');
        };

        var success = function (connections) {
            var isAlreadyConnected = connections.filter(function (connection) {
                return connection.portalId === JSON.stringify(portalId);
            }).length > 0;

            if (isAlreadyConnected) {
                createConnectionOverviewContent();
                return;
            }
            mfConnectService.findPortalById(portalId).then(showCredentialsForm, errorHandler);
        };
        mfConnectService.findConnectionsForProfile(mfConnectService.getProfileId()).then(success, errorHandler);
    }

    function showRecommendedPortals(recommendedPortals) {
        if (recommendedPortals.length === 0) {
            return;
        }

        var container = createHtmlElement('div', null, null);

        var space = document.createElement('br');
        container.appendChild(space);

        var header = createHtmlElement('h3', null, 'mf-list-header');
        header.innerHTML = 'Top recommended portals';
        container.appendChild(header);

        var list = createHtmlElement('ul', 'recommended-portals-list', 'mf-list--legacy');
        _.forEach(recommendedPortals, function (portal) {
            list.appendChild(createRecommendedPortalItem(portal, recommendedPortals));
        });
        container.appendChild(list);

        document.getElementById('createFindById').appendChild(container);
    }

    function createRecommendedPortalItem(recommendedPortal, recommendedPortals) {
        var item = createHtmlElement('li', undefined, 'mf-list__item');
        item.innerHTML += '<span class="mf-icon mf-icon__chevron-right--hollow--exact--large mf-list__pull-right mf-color__dim"></span><p class="mf-list__element--primary">' + recommendedPortal.portal.name + '</p>';

        item.onclick = function () {
            var portal = recommendedPortalToPreSelectedPortal(recommendedPortal);
            showPreSelectedPortal(portal, 'createFindById', recommendedPortals);
        };
        return item;
    }

    function recommendedPortalToPreSelectedPortal(recommendedPortal) {
        var portal = {};
        portal.portalId = recommendedPortal.portal.id;
        if (recommendedPortal.directoryLocation !== undefined) {
            portal.directoryLocation = {};
            portal.directoryLocation.directoryLocationId = recommendedPortal.directoryLocation.sourceId;
            portal.directoryLocation.directoryLocationType = recommendedPortal.directoryLocation.type;
        }
        return portal;
    }

    /*
     *  build out connection overview content
     *  mfUtils initialize connection overview returns needed data for the view
     */
    function createConnectionOverviewContent(previousView) {
        // this view we want to hide the previous view first and display the loading indicator
        if (previousView) {
            removePreviousView(previousView);
        }
        // hide error when screen first loads
        changeErrorVisibility(false);
        displayLoading(true);

        var connectionOverview = createHtmlElement('div', 'connectionOverview', 'connection-overview');

        var headerContent = document.createElement('div');

        // header
        var header = document.createElement('h1');
        header.innerHTML = 'Connections';
        headerContent.appendChild(header);

        // add new connection btn
        var subHeader = document.createElement('h2');
        var addNewConnection = createHtmlElement('button', undefined, 'mf-cta__primary--optional');
        addNewConnection.innerHTML = 'Add a connection';
        addNewConnection.onclick = function () {
            goToSearchForConnection('connectionOverview');
        };
        subHeader.appendChild(addNewConnection);
        headerContent.appendChild(subHeader);

        // paragraph
        var addConnectionInfo = document.createElement('p');
        addConnectionInfo.innerHTML = 'Add all your patient portals for a complete health record.';
        headerContent.appendChild(addConnectionInfo);

        connectionOverview.appendChild(headerContent);

        var successHandler = function (profileData) {
            createListOfProviders(connectionOverview, profileData);
        };
        var errorHandler = function (error) {
            createListOfProvidersErrorHandler(connectionOverview, error);
        };
        mfUtils.findProfileConnectionsAndPortals().then(successHandler, errorHandler);
    }

    function removePreviousView(previousView) {
        $('#' + previousView).remove();
    }

    function changeErrorVisibility(makeVisible) {
        var display = 'none';
        if (makeVisible) {
            display = 'block';
        }
        document.getElementById('mfConnectError').style.display = display;
    }

    // list of public variable that map to private function that are used strictly for testing purposes.
    /* test-code */
    MfConnect.prototype._displayError = displayError;
    MfConnect.prototype._goToSearchForConnection = goToSearchForConnection;
    MfConnect.prototype._getDirectorySearchResults = getDirectorySearchResults;
    MfConnect.prototype._goToSearchResults = goToSearchResults;
    MfConnect.prototype._selectSearchResult = directorySearchResultClick;
    MfConnect.prototype._goToSelectPortal = goToSelectPortal;
    MfConnect.prototype._selectPortal = selectPortal;
    MfConnect.prototype._goToEnterCredentials = goToEnterCredentials;
    MfConnect.prototype._createNewConnection = createNewConnection;
    MfConnect.prototype._goToConnectionDetails = goToConnectionDetails;
    MfConnect.prototype._goToUpdateCredentials = goToUpdateCredentials;
    MfConnect.prototype._refreshConnection = refreshConnection;
    MfConnect.prototype._updateConnection = updateConnection;
    MfConnect.prototype._deleteSelectedConnection = deleteSelectedConnection;
    MfConnect.prototype._createConnectionOverviewContent = createConnectionOverviewContent;
    /* end test-code */

    window.MfConnect = MfConnect;
})(window);

(function () {
    'use strict';
    // this line is necessary for initializing MfConnect

    var mfConnect = new MfConnect();
})();
