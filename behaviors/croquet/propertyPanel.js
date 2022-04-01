class PropertyPanelActor {
    setObject(target) {
        this.target = target;

        this.behaviorMenu = this.createCard({
            name: 'behavior menu',
            behaviorModules: ["BehaviorMenu"],
            translation: [0, 0.6, 0.055],
            type: "object",
            parent: this,
            noSave: true,
            target: target.id});
        this.behaviorMenu.call("BehaviorMenuActor", "show");

        this.cardSpec = this.createCard({
            className: "TextFieldActor",
            name: 'card spec',
            translation: [0, -1, -0.02],
            parent: this,
            type: "text",
            multiuser: true,
            margins: {left: 8, top: 8, right: 8, bottom: 8},
            textScale: 0.0012,
            backgroundColor: 0xffffff,
            width: 1,
            height: 2,
            depth: 0.05,
            autoResize: false,
            noDismissButton: true,
            borderRadius: 0.013,
            fullBright: true,
            runs: [{text: ""}],
            noSave: true,
        });

        this.dismissButton = this.createCard({
            className: "TextFieldActor",
            name: "dismiss button",
            translation: [0.5, 1.65, 0.005],
            parent: this,
            type: "text",
            multiuser: true,
            textScale: 0.002,
            backgroundColor: 0xffffff,
            readOnly: true,
            singleLine: true,
            autoResize: true,
            noDismissButton: true,
            width: 2,
            height: 2,
            depth: 0.05,
            runs: [{text: "ok"}],
            noSave: true,
        });

        this.dismissButton.addEventListener("pointerTap", "PropertyPanelActor.close");
        
        let cardDataString = this.cardSpecString(target);
        this.cardSpec.loadAndReset(cardDataString);
        this.scriptSubscribe(this.cardSpec.id, "text", "cardSpecAccept");
        this.scriptListen("dismiss", "dismiss");
    }

    cardSpecString(target) {
        let data = target.collectCardData();
        let intrinsic = this.intrinsicProperties();

        let result = [];
        
        // okay! risking to be over engineering, I'll make the display nicer.

        intrinsic.forEach((p) => {
            let value = data[p];
            if (value === undefined) {return;}
            result.push("    ");
            result.push(p);
            result.push(": ");
            result.push(this.specValue(p, value));
            result.push(",\n");
        });

        let keys = Object.keys(data);
        keys.sort();
        keys.forEach((p) => {
            if (intrinsic.includes(p)) {return;}
            let value = data[p];
            result.push("    ");
            result.push(p);
            result.push(": ");
            result.push(this.specValue(p, value));
            result.push(",\n");
        });

        return result.join('');
    }

    specValue(p, value) {
        if (Array.isArray(value)) {
            let frags = value.map((v) => JSON.stringify(v));
            return `[${frags.join(', ')}]`;
        }

        return JSON.stringify(value);
    }

    cardSpecAccept(data) {
        let {text} = data;

        let array = text.split('\n');
        let simpleRE = /^[ \t]*([^:]+)[ \t]*:[ \t]*(.*)$/;
        
        let spec = {};

        let something = false;

        array.forEach((line) => {
            let match = simpleRE.exec(line);
            if (match) {
                something = true;
                let key = match[1];
                let value = match[2];
                if (value && value.endsWith(",")) {
                    value = value.slice(0, value.length - 1);
                }
                try {
                    value = JSON.parse(value);
                } catch(e) {
                    console.log(e);
                }
                if (key === "rotation" || key === "dataRotation") {
                    if (Array.isArray(value) && value.length === 3) {
                        value = Worldcore.q_euler(...value);
                    }
                }
                spec[key] = value;
            }
        });
        
        if (!something) {return;}
        if (!this.target.doomed) {
            this.target.updateOptions(spec);
        }
    }

    close() {
        this.sayDeck("dismiss");
    }

    dismiss() {
        if (this.dismissButton) {
            this.dismissButton.destroy();
        }

        if (this.cardSpec) {
            this.cardSpec.destroy();
        }
        
        if (this.behaviorMenu) {
            this.behaviorMenu.destroy();
        }

        this.destroy();
    }
}

class BehaviorMenuActor {
    show() {
        if (this.menu) {
            this.menu.destroy();
        }

        this.menu = this.createCard({
            name: 'behavior menu',
            behaviorModules: ["Menu"],
            multiple: true,
            parent: this,
            type: "2d",
            noSave: true,
            cornerRadius: 0.05,
        });

        this.updateSelections();

        this.scriptListen("fire", "setBehaviors");
        this.scriptSubscribe(this._cardData.target, "behaviorUpdated", "updateSelections");
    }

    updateSelections() {
        console.log("updateSelections");
        let target = this.service("ActorManager").get(this._cardData.target);
        let items = [];

        let behaviorModules = [...this.behaviorManager.modules].filter(([_key, value]) => {
            return !value.systemModule;
        });

        behaviorModules.forEach(([k, _v]) => {
            let selected = target._behaviorModules && target._behaviorModules.indexOf(k) >= 0;
            let obj = {label: k, selected};
            items.push(obj);
        });

        items.push({label: '------------'});
        items.push({label: 'apply'});
        this.menu.call("MenuActor", "setItems", items);
    }

    setBehaviors(data) {
        console.log("setBehaviors");
        let target = this.service("ActorManager").get(this._cardData.target);
        target.setBehaviors(data.selection);
    }
}

export default {
    modules: [
        {
            name: "PropertyPanel",
            actorBehaviors: [PropertyPanelActor]
        },
        {
            name: "BehaviorMenu",
            actorBehaviors: [BehaviorMenuActor]
        }
    ]
};

/* globals Worldcore */