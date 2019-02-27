# Medfusion Connect

## Initial installation:
* Add the following to your bower.json file under dependencies
    * "mf-connect":	"https://bitbucket.org/mfgit/mf-connect.git#2.0.0"
* Run 'bower install' from  your terminal

## Including MfConnect if your project:
* Include a reference to the javascript in your HTML
    * <script src="bower_components/mf-connect/public/js/mf-connect.min.js"></script>
* Add the link to our css to the head of your HTML
    * <link rel="stylesheet" href="bower_components/mf-connect/public/styles/mf-connect.css" />
    * The paths to our javascript library and css will reflect where you store your other bower dependencies.
* Add our button to your page

<p class="mf-connect">
  <button id="mfConnectBtn" class="button mf-cta__primary mf-connect-btn" type="button">

    <span class="mf-icon mf-icon__medfusion-twirl mf-color__inverse"></span>

    Import Health Records
  </button>
</p>


## Launching MfConnect:
Our javascript library will automatically initialize MfConnect as a global object. This makes it easily available to you through the window

var MfConnect = window.MfConnect;

You will need to set a parameters object to send to MfConnect when it is launched.

var params = {
    customerUuid: 'yourCustomerUuid',
    userUuid: 'userUuid',
    accessToken: '',
    url: '',
    apiKey: ''
};

Add the following to launch MfConnect. This should be in the onClick function attached to MfConnectBtn

MfConnect.prototype.launch(params);

## ChangeLog/Release notes

#### Version 1.2.0 (9/1/2017)
- Change size of MfConnect Modal
- Clean up search results (duplicate names)
- Swap Medfusion 'o' icon for correct one
- Update message when unknown error occurs
- Fixed location of spinner/loading icon
- Add click block when data loading
- Display location address on enter credentials screen

#### Version 1.3.0 (9/7/2017)
- Display location address instead of 'Name Unavailable' in search

#### Version 1.4.0 (6/26/2018)
- Add User Events:
  - onOpenDialog
  - onCloseDialog
  - onError
  - onProviderSelect
  - onLocationSelect
  - onPortalSelect
  - onSearchProvider
  - onConnectProvider
  - onUpdateProvider
  - onDeleteProvider
  - onRefreshProvider
- Disable auto-fill/auto-complete on credentials form

#### Version 1.5.0 (10/25/2018)
- Add deep linking functionality
- Add recommended portals functionality

#### Version 2.0.0 (TBD)
- New UI/UX
- Add search filters
- Add search by portal URL
- Validating credentials screen
- Update styles for connection status
- Display connections by portal name
- Launch portal ability
