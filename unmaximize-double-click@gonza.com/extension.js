
const { Clutter, Meta, Shell } = imports.gi;
const Gi = imports._gi;

const Main = imports.ui.main;

const panel = imports.ui.main.panel;

let lastClickTime = -1;

let injections = {};


// developer.gnome.org/gtk3/stable/GtkSettings.html#GtkSettings--gtk-double-click-time
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
	if (currentTime - lastClickTime < 400 && Main.modalCount === 0) { // && event.source === this) {
		let win = global.display.get_focus_window();
		// if (!win.maximized_vertically && !win.maximized_horizontally) {
		if (win && win.get_maximized()) {
			win.unmaximize(Meta.MaximizeFlags.BOTH);
			actionDone = true;
		}
	}
	lastClickTime = currentTime;

	if (!actionDone)
		return _tryDragWindow_copy.call(this, event);
	else
		return Clutter.EVENT_STOP;
}


// gitlab.gnome.org/GNOME/gnome-shell/-/blob/master/js/ui/panel.js#L923
function _tryDragWindow_copy(event) {
	let { x, y } = event;
	let dragWindow = this._getDraggableWindowForPosition(x);

	if (!dragWindow)
		return Clutter.EVENT_PROPAGATE;

	return global.display.begin_grab_op(
		dragWindow,
		Meta.GrabOp.MOVING,
		false, /* pointer grab */
		true, /* frame action */
		event.button || -1,
		event.modifier_state,
		event.time,
		x, y) ? Clutter.EVENT_STOP : Clutter.EVENT_PROPAGATE;
}


// gitlab.gnome.org/GNOME/gnome-shell/-/blob/master/js/ui/panelMenu.js#L133
function AppMenuButton_vfunc_event(event) {
	return Clutter.EVENT_PROPAGATE;
}


function listener(_, event) {
	if (event.get_button() === 1)
		return Clutter.EVENT_PROPAGATE;

	let win = global.display.get_focus_window();
	if (!win)
		return Clutter.EVENT_PROPAGATE;

	let max = win.get_maximized();
	if (event.get_button() === 2) {
		// Middle click
		if (win.maximized_vertically)
			win.unmaximize(Meta.MaximizeFlags.VERTICAL);
		else
			win.maximize(Meta.MaximizeFlags.VERTICAL);
	} else if (event.get_button() === 3) {
		// Right click
		if (win.maximized_horizontally)
			win.unmaximize(Meta.MaximizeFlags.HORIZONTAL);
		else
			win.maximize(Meta.MaximizeFlags.HORIZONTAL);
	}
	
	return Clutter.EVENT_STOP;
}


function init(metadata) {
}


function enable() {
	injections._tryDragWindow = panel._tryDragWindow;
	panel._tryDragWindow = _tryDragWindow;

	injections.vfunc_event = panel.statusArea['appMenu'].__proto__.vfunc_event;
	panel.statusArea['appMenu'].__proto__[Gi.hook_up_vfunc_symbol]('event', (event) => {
		AppMenuButton_vfunc_event(event);
	})

	topBarClickListener_ = Main.panel.actor.connect("button-press-event", listener);
}


function disable() {
	panel._tryDragWindow = injections._tryDragWindow;
	panel.statusArea['appMenu'].__proto__[Gi.hook_up_vfunc_symbol]('event', injections.vfunc_event);
	Main.panel.actor.disconnect(topBarClickListener_);
}
