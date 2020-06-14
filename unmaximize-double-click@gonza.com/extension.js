/* -*- mode: js; js-basic-offset: 4; indent-tabs-mode: nil -*- */

const { Clutter, Meta, Shell } = imports.gi;

const Main = imports.ui.main;

const panel = imports.ui.main.panel;

let lastClickTime = -1;

let injections = {};


// https://developer.gnome.org/gtk3/stable/GtkSettings.html#GtkSettings--gtk-double-click-time
// gtk-double-click-time 400
// gtk-double-click-distance 5
function _tryDragWindow(event) {
	let currentTime = global.get_current_time();
	if (lastClickTime === -1) {
		lastClickTime = currentTime;
		return injections._tryDragWindow.call(this, event);
	}
	// let clickCount = Clutter.get_current_event().get_click_count();
	let actionDone = false;
	if (currentTime - lastClickTime < 400 && Main.modalCount === 0 && event.source === this) {
		let win = global.display.get_focus_window();
		// if (!win.maximized_vertically && !win.maximized_horizontally) {
		if (win.get_maximized()) {
			win.unmaximize(Meta.MaximizeFlags.BOTH);
			actionDone = true;
		}
	}
	lastClickTime = currentTime;

	if (!actionDone)
		return injections._tryDragWindow.call(this, event);
	else
		return Clutter.EVENT_STOP;
}


function init(metadata) {
}


function enable() {
	try {
		// global.log(panel.vfunc_button_press_event);
		injections._tryDragWindow = panel._tryDragWindow;
		panel._tryDragWindow = _tryDragWindow;
	} catch(e) {
		global.log("Error\n" + e)
	}
}


function disable() {
	if (injections._tryDragWindow) {
		panel._tryDragWindow = injections._tryDragWindow;
	}
	panel = null;
}
