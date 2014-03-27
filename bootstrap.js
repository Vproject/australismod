const { classes: Cc, interfaces: Ci, utils: Cu } = Components;
Cu.import('resource://gre/modules/Services.jsm');

//const consoleJSM = Cu.import("resource://gre/modules/devtools/Console.jsm", {});
//let console = consoleJSM.console; //access exported symbol of "console" from the Console.jsm
//console.log("hi"); //output messages to the console

let navtoolboxid = 'navigator-toolbox';
let titletoolbarid = 'smalltitletoolbar';

let titlebartextid = 'smalltitle';
let titlebartextlabelid = 'smalltitlelabel';

let stylesheetService;
let cssdata;

let tabbarid = 'TabsToolbar';
let tabbarmenupopupid = 'tabbarmenupopup' ;

let tabcontextmenuid = 'tabContextMenu';
let closewindowmenuitemid = 'closewindowmenuitem' ;

let tabsid = 'tabbrowser-tabs';




function startup(data, reason) {
    /// <summary>
    /// Bootstrap data structure @see https://developer.mozilla.org/en-US/docs/Extensions/Bootstrapped_extensions#Bootstrap_data
    /// &#10;  string id
    /// &#10;  string version
    /// &#10;  nsIFile installPath
    /// &#10;  nsIURI resourceURI
    /// &#10;
    /// Reason types:
    /// &#10;  APP_STARTUP
    /// &#10;  ADDON_ENABLE
    /// &#10;  ADDON_INSTALL
    /// &#10;  ADDON_UPGRADE
    /// &#10;  ADDON_DOWNGRADE
    /// </summary>

	let windows = Services.wm.getEnumerator("navigator:browser");

	/* create and load stylesheet, initializes stylesheetService and cssdata */
	changestyles();

	while (windows.hasMoreElements()) {
		let domWindow = windows.getNext().QueryInterface(Ci.nsIDOMWindow);
		loadIntoWindow(domWindow);
	}

	// Load into any new windows
	Services.wm.addListener(windowListener);
}

function shutdown(data, reason) {
    /// <summary>
    /// Bootstrap data structure @see https://developer.mozilla.org/en-US/docs/Extensions/Bootstrapped_extensions#Bootstrap_data
    /// &#10;  string id
    /// &#10;  string version
    /// &#10;  nsIFile installPath
    /// &#10;  nsIURI resourceURI
    /// &#10;
    /// Reason types:
    /// &#10;  APP_SHUTDOWN
    /// &#10;  ADDON_DISABLE
    /// &#10;  ADDON_UNINSTALL
    /// &#10;  ADDON_UPGRADE
    /// &#10;  ADDON_DOWNGRADE
    /// </summary>
	if (reason == APP_SHUTDOWN)
		return;

	// Stop listening for new windows
	Services.wm.removeListener(windowListener);

	// Unload from any existing windows
	let windows = Services.wm.getEnumerator("navigator:browser");
	while (windows.hasMoreElements()) {
		let domWindow = windows.getNext().QueryInterface(Ci.nsIDOMWindow);
		unloadFromWindow(domWindow);
	}

	if(stylesheetService && cssdata) {
		stylesheetService.unregisterSheet(cssdata, stylesheetService.USER_SHEET);
	}

}


function install(data, reason) {
    /// <summary>
    /// Bootstrap data structure @see https://developer.mozilla.org/en-US/docs/Extensions/Bootstrapped_extensions#Bootstrap_data
    /// &#10;  string id
    /// &#10;  string version
    /// &#10;  nsIFile installPath
    /// &#10;  nsIURI resourceURI
    /// &#10;
    /// Reason types:
    /// &#10;  ADDON_INSTALL
    /// &#10;  ADDON_UPGRADE
    /// &#10;  ADDON_DOWNGRADE
    /// </summary>
}

function uninstall(data, reason) {
    /// <summary>
    /// Bootstrap data structure @see https://developer.mozilla.org/en-US/docs/Extensions/Bootstrapped_extensions#Bootstrap_data
    /// &#10;  string id
    /// &#10;  string version
    /// &#10;  nsIFile installPath
    /// &#10;  nsIURI resourceURI
    /// &#10;
    /// Reason types:
    /// &#10;  ADDON_UNINSTALL
    /// &#10;  ADDON_UPGRADE
    /// &#10;  ADDON_DOWNGRADE
    /// </summary>
}

function loadIntoWindow(window) {
	if (!window)
		return;

    /* create newtoolbar and initialize navtoolbox and titletoolbar */
	let titletoolbar = newtoolbar(window.document);

    /* adds titlebartext to titletoolbar and initializes titlebartext */
	addtitle(window.document, titletoolbar);

	/* create, inject and override popup menu for tabbar, initializes tabbarmenupopup and tabbar */
	overridetabbarpopupmenu(window.document);

	/* adds close window option to tab context menu, initializes closewindowmenuitem and tabcontextmenu */
	addclosewindowtotabmenu(window.document);

	/* listen for double click on tabs, call dblclicklistener() and initializes tabs */
	maximizeontabdoubleclick(window.document);

}

function unloadFromWindow(window) {
	if (!window)
		return;

	let document = window.document;
	
	let titletoolbar = document.getElementById(titletoolbarid);
	let titlebartext = document.getElementById(titlebartextid);
	if(titletoolbar && titlebartext) {
		titletoolbar.removeChild( titlebartext );
	}

	let navtoolbox = document.getElementById(navtoolboxid);
	if(navtoolbox && titletoolbar) {
		navtoolbox.removeChild(titletoolbar);
	}
	
	let tabbar = document.getElementById(tabbarid);
	let tabbarmenupopup = document.getElementById(tabbarmenupopupid);
	if(tabbar && tabbarmenupopup) {
		tabbar.removeChild( tabbarmenupopup );
	}
	
	let tabcontextmenu = document.getElementById(tabcontextmenuid);
	let closewindowmenuitem = document.getElementById(closewindowmenuitemid);
	if(tabcontextmenu && closewindowmenuitem) {
		tabcontextmenu.removeChild( closewindowmenuitem );
	}

	let tabs = document.getElementById(tabsid);
	if(tabs && dblclicklistener) {
		tabs.removeEventListener('dblclick',dblclicklistener ,true);
		tabs.removeEventListener('dblclick',dblclicklistener ,false);
	}

}


let windowListener = {
	onOpenWindow: function(aWindow) {
		// Wait for the window to finish loading
		let domWindow = aWindow.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindowInternal || Ci.nsIDOMWindow);
		domWindow.addEventListener("load", function onLoad() {
			domWindow.removeEventListener("load", onLoad, false);
			loadIntoWindow(domWindow);
		}, false);
	},

	onCloseWindow: function(aWindow) {},
	onWindowTitleChange: function(aWindow, aTitle) {
		/* synchronizes window title with small title bar */
		let titlebartextlabel = aWindow.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindowInternal || Ci.nsIDOMWindow).document.getElementById(titlebartextlabelid);
		if(titlebartextlabel)
			titlebartextlabel.setAttribute('value', aTitle);
	}
};



/*
	create a new toolbar
	initializes:
		navtoolbox
		titletoolbar
*/
function newtoolbar(document) {
	if(!document || document.getElementById(titletoolbarid) )
		return;

	navtoolbox = document.getElementById(navtoolboxid);

	titletoolbar = document.createElement('toolbar');
	titletoolbar.id = titletoolbarid;
	titletoolbar.class = "toolbar-primary chromeclass-toolbar";
	titletoolbar.customizable="true";
	titletoolbar.mode="icons";
	titletoolbar.iconsize="small";
	titletoolbar.context="toolbar-context-menu";
	titletoolbar.toolbarname="Small Title Toolbar";
	titletoolbar.lockiconsize="true";

	if(navtoolbox) {
		navtoolbox.appendChild(titletoolbar);	
	}
	
	return titletoolbar;
}

/*
	adds titlebartext to titletoolbar
	initializes:
		titlebartext
		titlebartextlabel
*/
function addtitle(document, titletoolbar) {
	if(!document )
		return;
	
	let titlebartext = document.createElement('toolbaritem');
	let titlebartextlabel = document.createElement('label');
	titlebartext.setAttribute('flex', 1);
	titlebartextlabel.setAttribute('flex', 1);
	titlebartextlabel.setAttribute('crop', 'center');
	titlebartextlabel.setAttribute('value', document.title);

	titlebartextlabel.setAttribute('id', titlebartextlabelid );
	titlebartext.setAttribute('id', titlebartextid );
/*
	titlebartext.style.textAlign = 'center';
*/
	titlebartext.style.marginLeft = '25px';

	titlebartext.appendChild(titlebartextlabel);

	if(titletoolbar) {
		titletoolbar.appendChild(titlebartext);
	}
}


/*
	create and load stylesheet
	initializes:
		stylesheetService
		cssdata
*/
function changestyles() {
	if(Cc['@mozilla.org/content/style-sheet-service;1'] && Cc["@mozilla.org/network/io-service;1"])
	{
		stylesheetService = Cc['@mozilla.org/content/style-sheet-service;1'].getService(Components.interfaces.nsIStyleSheetService);

	/*
		* style new titlebar
		* put navbar below new titlebar (using -moz-box-ordinal-group)
		* adjust colors, borders for new toolbar order
		* reduce padding, margins (including window borders and 
		* reduce tab and tabbar height
		* tiles on newtab scale in size again, pref'd rows/columns preserved
	*/
		let css = '\
#smalltitle, \
#smalltitle > label \
{\
	font-size:10px;\
	margin-top: 0px !important;\
	margin-bottom: 0px !important;\
}\
\
#smalltitletoolbar \
{\
	height: 14px;\
	min-height: 14px !important;\
	background-image: linear-gradient(rgba(253, 253, 253, 0.45), rgba(255, 255, 255, 0));\
	border-color: #a8b0b7 !important;\
}\
\
#nav-bar \
{\
	border-top: 0px !important;\
	-moz-box-ordinal-group: 2;\
	background-image: none !important;\
	box-shadow: none !important;\
	border-top-right-radius: 0px !important;\
	border-top-left-radius: 0px !important;\
	border-color: #a8b0b7 !important;\
}\
\
#nav-bar .toolbarbutton-1:not([type=\"menu-button\"]), \
#nav-bar .toolbarbutton-1 > .toolbarbutton-menubutton-button, \
#nav-bar .toolbarbutton-1 > .toolbarbutton-menubutton-dropmarker \
{\
	padding-bottom: 0px !important;\
	padding-top: 0px !important;\
}\
\
#back-button \
{\
	margin-top: 1px !important;\
	margin-bottom: 1px !important;\
}\
\
.tab-background-start[selected=true]::after, \
.tab-background-start[selected=true]::before, \
.tab-background-start, \
.tab-background-end, \
.tab-background-end[selected=true]::after, \
.tab-background-end[selected=true]::before, \
#tabbrowser-tabs \
{\
	min-height: 27px !important;\
}\
\
window#main-window, \
window, \
#main-window \
{\
	chromemargin: 0,1,1,1 !important;\
}\
\
#TabsToolbar \
{\
	margin-top: 0px !important;\
}\
\
.newtab-cell \
{\
	height: 104px !important;\
	width: 148px !important;\
    -moz-box-flex: 1;\
}\
\
.newtab-row \
{\
    -moz-box-flex: 1;\
}';

		cssdata = Cc["@mozilla.org/network/io-service;1"].getService(Ci.nsIIOService).newURI('data:text/css,' + encodeURIComponent(css), null, null);
		if(!stylesheetService.sheetRegistered(cssdata, stylesheetService.USER_SHEET))
		{
			stylesheetService.loadAndRegisterSheet(cssdata, stylesheetService.USER_SHEET);
		}
	
	} //if(Cc['@mozilla.org/content/style-sheet-service;1'] && Cc["@mozilla.org/network/io-service;1"])
	
}


/*
	create, inject and override popup menu for tabbar
	initializes:
		tabbarmenupopup
		tabbar
*/
function overridetabbarpopupmenu(document) {
	let tabbarmenupopup = document.createElement('menupopup');
	tabbarmenupopup.innerHTML = "<menuitem label='Restore' disabled='true' oncommand='window.restore();'/><menuitem label='Move' hidden='true' oncommand=''/><menu label='Toolbars'><menupopup onpopupshowing='onViewToolbarsPopupShowing(event);'/></menu><menuitem label='Minimize' oncommand='window.minimize();' /><menuitem label='Maximize' oncommand='window.maximize();' /><menuitem label='Close Window' oncommand='window.close();' accesskey='C' />";
	tabbarmenupopup.setAttribute('onpopupshowing', "if(window.windowState == window.STATE_MAXIMIZED){this.getElementsByAttribute( 'label', 'Restore')[0].removeAttribute('disabled'); this.getElementsByAttribute( 'label', 'Maximize')[0].setAttribute('disabled', 'true'); }else{this.getElementsByAttribute( 'label', 'Maximize')[0].removeAttribute('disabled'); this.getElementsByAttribute( 'label', 'Restore')[0].setAttribute('disabled', 'true');}");
	tabbarmenupopup.id = tabbarmenupopupid;
	/*
	override context='toolbar-context-menu' attribute with context='_child'
	*/
	let tabbar = document.getElementById(tabbarid);
	if(tabbar) {
		tabbar.appendChild(tabbarmenupopup);
		tabbar.setAttribute('context','_child');
	}
}


/*
	adds close window option to tab context menu
	initializes:
		closewindowmenuitem
		tabcontextmenu
*/
function addclosewindowtotabmenu(document) {
	let closewindowmenuitem = document.createElement('menuitem');
	closewindowmenuitem.setAttribute('label' , 'Close Window');
	closewindowmenuitem.setAttribute('oncommand' , 'window.close();' );
	closewindowmenuitem.id = closewindowmenuitemid;
	let tabcontextmenu = document.getElementById(tabcontextmenuid);
	let contextcloseothertabs = document.getElementById("context_closeOtherTabs");
	if(tabcontextmenu && contextcloseothertabs)
		tabcontextmenu.insertBefore(closewindowmenuitem, contextcloseothertabs.nextSibling);
}



/*
	dblclick on tab -> maximize, restore if already maximized
*/
function dblclicklistener(event) {
	if(event.originalTarget.localName == 'box' || event.originalTarget.localName == 'toolbarbutton' || event.originalTarget.localName == 'scrollbox')
		return;
	let window = event.view;
	if(window.windowState == window.STATE_MAXIMIZED)
	{
		window.restore();
	}
	else
	{
		window.maximize();
	}
}

/*
	listen for double click on tabs, call dblclicklistener()
	initializes:
		tabs
*/
function maximizeontabdoubleclick(document) {
	let tabs = document.getElementById(tabsid);
	if(tabs && dblclicklistener)
		tabs.addEventListener('dblclick',dblclicklistener);
}
