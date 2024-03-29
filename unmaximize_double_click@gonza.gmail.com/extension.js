
const { Clutter, Meta, Shell } = imports.gi;
const Gi = imports._gi;

const Main = imports.ui.main;

const panel = Main.panel;

let lastClickTime = -1;
let topBarClickListener_ = null;

let injections = {};


// developer.gnome.org/gtk3/stable/GtkSettings.html#GtkSettings--gtk-double-click-time
// gtk-double-click-time 400
// gtk-double-click-distance 5
// gitlab.gnome.org/GNOME/gnome-shell/-/blob/main/js/ui/panel.js#L558
function _tryDragWindow(event) {
	let currentTime = global.get_current_time();
	if (lastClickTime === -1) {
		lastClickTime = currentTime;
		return injections._tryDragWindow.call(this, event);
	}
	// let clickCount = Clutter.get_current_event().get_click_count();
	let actionDone = false;
	const eventSource = event.source || event.get_source();
	if (currentTime - lastClickTime < 400
			&& Main.modalCount === 0
			&& (eventSource === this || eventSource === panel.statusArea['appMenu'])) {

		const win = global.display.get_focus_window();
		if (win && win.get_maximized()) {
			win.unmaximize(Meta.MaximizeFlags.BOTH);
			actionDone = true;
		}
	}

	// The handler on panelMenu that toggles the menu doesn’t stop the event
	// (the one linked on AppMenuButton_vfunc_event)
	// We don’t want to be able to drag when closing a menu, nor lose focus
	// (except on appmenu)
	if (eventSource.hasOwnProperty('menu') && !(eventSource === panel.statusArea['appMenu']))
		actionDone = true

	lastClickTime = currentTime;

	return !actionDone ? injections._tryDragWindow.call(this, event) : Clutter.EVENT_STOP;
}

// Deactivates the appmenu
// gitlab.gnome.org/GNOME/gnome-shell/-/blob/main/js/ui/panelMenu.js#L133
function AppMenuButton_vfunc_event(event) {
	return Clutter.EVENT_PROPAGATE;
}


function isParent(child, parent, end) {
	let ancestor = child;
	do {
		if (!ancestor || ancestor === end)
			return false;
		if (ancestor === parent)
			return true;

		ancestor = ancestor.get_parent();
	} while (true);
}


function listener(source, event) {
	if (event.get_button() === 1)
		return Clutter.EVENT_PROPAGATE;

	const [x, y] = event.get_coords();
	let real_src = event.get_stage().get_actor_at_pos(Clutter.PickMode.ALL, x, y);

	if (!(source === real_src || isParent(real_src, panel.statusArea['appMenu'], panel)))
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

	try {
		injections.vfunc_event = panel.statusArea['appMenu'].__proto__.vfunc_event;
		panel.statusArea['appMenu'].__proto__[Gi.hook_up_vfunc_symbol]('event', (event) => {
			AppMenuButton_vfunc_event(event);
		});
	} catch (e) {
		const appMenuPrototype = Object.getPrototypeOf(panel.statusArea['appMenu']);
		injections.vfunc_event = appMenuPrototype.vfunc_event;
		appMenuPrototype[Gi.gobject_prototype_symbol][Gi.hook_up_vfunc_symbol]('event', (event) => {
			AppMenuButton_vfunc_event(event);
		});
	}

	topBarClickListener_ = panel.connect("button-press-event", listener);
}

function disable() {
	panel._tryDragWindow = injections._tryDragWindow;

	try {
		panel.statusArea['appMenu'].__proto__[Gi.hook_up_vfunc_symbol]('event', injections.vfunc_event);
	} catch (e) {
		const p = Object.getPrototypeOf(panel.statusArea['appMenu']);
		p[Gi.gobject_prototype_symbol][Gi.hook_up_vfunc_symbol]('event', injections.vfunc_event);
	}

	panel.disconnect(topBarClickListener_);
}
