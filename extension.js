/* extension.js
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

const {Gio, GLib, GObject, St} = imports.gi;
const ByteArray = imports.byteArray;

import {Extension, gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';

import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

let that;

const Indicator = GObject.registerClass(
class Indicator extends PanelMenu.Button {
    constructor(that) {
        super();
    }
    
    _init() {
        super._init(0.0, _('KUBERNETES_CONTEXT'));


        let contextAndNamespace = new St.BoxLayout({ vertical: false }); // Horizontal layout
        
        let kube = Gio.icon_new_for_string(`${that.path}/kube.svg`);
        let icon = new St.Icon({
            gicon: kube,
            style_class: "system-status-icon",
          });

          
        this.currentContextNamespaceLabel = new St.Label({
          text: 'UNKNOWN / UNKNOWN',
          style_class: "system-status-icon",
        });

        contextAndNamespace.add_child(icon);
        contextAndNamespace.add_child(this.currentContextNamespaceLabel);

        this.add_child(contextAndNamespace);
        
        this.connect('button-press-event', () => {
            Main.notify(`Updating current context / namespace...`);
            this.refreshCurrentContext();
        });

        this.poll();
    }

    destroy() {
        GLib.Source.remove(this.ticker);
    }

    poll() {
        const interval = 10000;
        this.ticker = GLib.timeout_add(GLib.PRIORITY_DEFAULT, interval, () => {
          this.refreshCurrentContext();
          return true;
        });
    }

    refreshCurrentContext() {
        let context = "UNKNOWN";
        let namespace = "UNKNOWN";
        try {
            // Get the current context
            const [ok, standard_output, standard_error, exit_status] =
                GLib.spawn_command_line_sync("kubectl config current-context");
            if (ok) {
                context = ByteArray.toString(standard_output).trim();
            } else {
                let err = ByteArray.toString(standard_error).trim();
                throw new Error(err);
            }
            try {
                // Get the current namespace
                const [ok, standard_output, standard_error, exit_status] =
                    GLib.spawn_command_line_sync("kubectl config view --minify -o jsonpath='{..namespace}'");
                if (ok) {
                    namespace = ByteArray.toString(standard_output).trim();
                } else {
                    let err = ByteArray.toString(standard_error).trim();
                    throw new Error(err);
                }
            } catch (e) {
                namespace = "ERROR";
            }
        } catch (e) {
            context = "ERROR";
        } finally {
            this.currentContextNamespaceLabel.set_text(`${context} / ${namespace}`);
            this.currentContextNamespaceLabel.queue_redraw();
        }
    }
});

export default class IndicatorExampleExtension extends Extension {
    enable() {
        that = this;
        this._indicator = new Indicator(this);
        Main.panel.addToStatusArea(this.uuid, this._indicator);
    }

    disable() {
        this._indicator.destroy();
        this._indicator = null;
    }
}
