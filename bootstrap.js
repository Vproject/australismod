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

	/* unload css */
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
	let document = window.document;
    /* create newtoolbar and initialize navtoolbox and titletoolbar */
	let titletoolbar = newtoolbar(document);

    /* adds titlebartext to titletoolbar and initializes titlebartext */
	addtitle(document, titletoolbar);

	/* create, inject and override popup menu for tabbar, initializes tabbarmenupopup and tabbar */
	overridetabbarpopupmenu(document);

	/* adds close window option to tab context menu, initializes closewindowmenuitem and tabcontextmenu */
	addclosewindowtotabmenu(document);

	/* listen for double click on tabs, call dblclicklistener() and initializes tabs */
	maximizeontabdoubleclick(document);
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
		let window = aWindow.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindowInternal || Ci.nsIDOMWindow);
		
		/* synchronizes window title with small title bar */
		let titlebartextlabel = window.document.getElementById(titlebartextlabelid);
		if(titlebartextlabel)
			titlebartextlabel.setAttribute('value', aTitle);
	}
};



/*
	create a new toolbar
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

		let newtabgrid = newtabcss();

	/*
		* style new titlebar
		* allow dragging a window by the new titletoolbar (and more)
		* put navbar below new titlebar (using -moz-box-ordinal-group)
		* adjust colors, borders for new toolbar order
		* reduce padding, margins (including space above tabbar)
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
	-moz-binding: url(\"chrome://browser/content/customizableui/toolbar.xml#toolbar-drag\");\
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
	-moz-box-align: center !important;\
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
#TabsToolbar \
{\
	margin-top: 0px !important;\
}'+newtabgrid;

		cssdata = Cc["@mozilla.org/network/io-service;1"].getService(Ci.nsIIOService).newURI('data:text/css,' + encodeURIComponent(css), null, null);
		if(!stylesheetService.sheetRegistered(cssdata, stylesheetService.USER_SHEET))
		{
			stylesheetService.loadAndRegisterSheet(cssdata, stylesheetService.USER_SHEET);
		}
	
	} //if(Cc['@mozilla.org/content/style-sheet-service;1'] && Cc["@mozilla.org/network/io-service;1"])
	
}


/*
	create, inject and override popup menu for tabbar
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
*/
function maximizeontabdoubleclick(document) {
	let tabs = document.getElementById(tabsid);
	if(tabs && dblclicklistener)
		tabs.addEventListener('dblclick',dblclicklistener);
}


/*
	modify about:newtab page to resize tiles instead of reducing the number of visible tiles
*/
function newtabcss () {
	
		/* function to be inserted in xbl constructor */
		let scalenewtabtilesfunc = function(gridnode) {

			if(!window || window.hasrows) {
				console.log("australismod: scalenewtabtilesfunc: !window="+!window+" window.hasrows="+window.hasrows);
				return;
			}
			window.hasrows = true;
			
			let grid = window.gGrid;
			if(grid) if(grid._shouldRenderGrid ) if(grid._resizeGrid) {
				gridnode.style = "display: none;";

				/* override function to prevent recalculation of grid dimensions */
				grid._resizeGridbackup = grid._resizeGrid;
				grid._shouldRenderGridbackup = grid._shouldRenderGrid;
				grid._resizeGrid = function() { };
				grid._shouldRenderGrid = function() {return false;};

				/* create namespaced element, otherwise contextmenu might not show on right click */
				let protorow = document.createElementNS("http://www.w3.org/1999/xhtml","div");
				protorow.className = "newtab-row";

				/* load gGridPrefs.gridRows and gGridPrefs.gridColums to local variables */
				let {gridRows, gridColumns} = window.gGridPrefs;
				
				let cells = gridnode.children;
				let numcell = Math.min(cells.length, gridRows*gridColumns);

				let newgrid = document.createDocumentFragment();
				
				for(let i = 0, j, k = 0; i < gridRows; i++)
				{
					let row = protorow.cloneNode(false);
					for(j = 0; j<gridColumns ; j++, k++)
					{
						if(k >= numcell)
							break;
						let cell = cells[0];
						gridnode.removeChild(cell);
						row.appendChild(cell);
					}
					newgrid.appendChild( row );
				}
				
				if(window.undoscaling)
				{
					/* AddonListener already exists. Only insert grid with rows. */
					gridnode.appendChild(newgrid);
					gridnode.style = "";
					return;
				}
				
				/* insert script that restores fixed size tiles */
				let undoscaling = function() 
				{
					try {
						Components.utils.import("resource://gre/modules/AddonManager.jsm");
					} catch(ex) {
						console.log("australismod: addonmanager import failed. ex="+ex);
						if(!AddonManager) {
							console.log("!AddonManager");
							return;
						}
					}
					let addondisabled = {
						onEnabled: function(addon)
						{
							if (addon.id == "australismod@V.project")
							{
								try {
									if(!window || window.hasrows || !window.gGrid) {
										console.log("australismod: onenabled handler: !window="+!window+" window.hasrows="+window.hasrows+" !window.gGrid="+!window.gGrid);
										AddonManager.removeAddonListener(this);
										return;
									}
								} catch(ex) {
									console.log("australismod: newtab onenabled handler failed. ex="+ex);
									AddonManager.removeAddonListener(this);
									return;
								}
								try {
									if(window.gGrid._node)
									{
										if (window.gGrid._node.scalingtiles )
										{
											window.gGrid._node.scalingtiles();
										}
										else
										{
											AddonManager.removeAddonListener(this);
										}
									}
									else
									{
										AddonManager.removeAddonListener(this);
									}
								} catch(ex) {
									console.log("australismod: window.gGrid._node.scalingtiles() failed. ex="+ex);
									AddonManager.removeAddonListener(this);
									return;
								}
								
							}
						},
						onDisabled: function(addon)
						{
							if (addon.id == "australismod@V.project")
							{
								try {
									
									if(!window || !window.hasrows) {
										console.log("australismod: ondisabled handler: !window="+!window+" !window.hasrows="+!window.hasrows);
										return;
									}
									
									let grid = window.gGrid;
									if(grid) if(grid._shouldRenderGrid ) {
						
										let refCell = document.querySelector(".newtab-cell");
								        grid._cellMargin = parseFloat(getComputedStyle(refCell).marginTop) * 2;
								        grid._cellHeight = refCell.offsetHeight + grid._cellMargin;
								        grid._cellWidth = refCell.offsetWidth + grid._cellMargin;
	
	
										/* remove rows */
										let gridnode = grid._node;
										let rows = gridnode.getElementsByClassName("newtab-row");
	
										for(let i=rows.length-1; i>=0; --i)
										{
											gridnode.removeChild(rows[i]);
										}
										
										window.hasrows = false;
										
										/* restore functions and allow recalculation of grid dimensions */
										grid._resizeGrid = grid._resizeGridbackup;
										grid._shouldRenderGrid = grid._shouldRenderGridbackup;
										
										/* render cells/tiles */
								        grid._renderGrid();
								        grid._resizeGrid();
								        grid._renderSites();
										
									}
								} catch(ex) {
									console.log("australismod: ondisabled handler: ex="+ex);
								}
								
							}
						}
					};
					try {
						AddonManager.addAddonListener(addondisabled);
					} catch(ex) {
						console.log("australismod: adding AddonListener failed. ex="+ex);
					}
				};
				let undo = document.createElementNS("http://www.w3.org/1999/xhtml","script");
				undo.type = "text/javascript;version=1.8";
				undo.innerHTML = "let undoscaling ="+undoscaling.toSource()+";\n\nundoscaling();";
				
				gridnode.parentElement.appendChild( undo );				
				
				gridnode.appendChild(newgrid);
				
				gridnode.style = "";
			}
		};
		
		/* build xbl source */
		let scalenewtabtilesxbl = "\
<?xml version=\"1.0\"?>\
<bindings xmlns=\"http://www.mozilla.org/xbl\">\
	<binding id=\"scalingnewtabtiles\">\
		<content>\
			<children/>\
		</content>\
		<implementation>\
			<constructor>\n\
				scalingtiles();\
			</constructor>\
			<method name=\"scalingtiles\">\
			<body>\
				let scalenewtabtilesfunc = "+scalenewtabtilesfunc.toSource().replace(/[<>]/g, function(ltgt){ return ((ltgt == '<')? '&lt;' : '&gt;') } )+";\
				scalenewtabtilesfunc(this);\
			</body>\
			</method>\
		</implementation>\
	</binding>\
</bindings>";

		/* newtab css, uri encode xbl and bind it to newtab-grid */
		let newtabgrid = '\
#newtab-grid \
{\
	-moz-binding: url(\"data:text/xml,'+encodeURIComponent(scalenewtabtilesxbl)+'\") !important;\
	display: -moz-box;\
	-moz-box-orient: vertical;\
	margin-bottom: 25px;\
	overflow: visible !important;\
}\
\
.newtab-cell \
{\
	-moz-box-flex: 1;\
}\
\
.newtab-row \
{\
	-moz-box-flex: 1;\
	display: -moz-box;\
}\
\
#newtab-search-form {\
	height: auto !important;\
	margin-bottom: 0px !important;\
}\
\
#newtab-undo-container {\
	margin-bottom: 0px !important;\
}';

	return newtabgrid;
}
