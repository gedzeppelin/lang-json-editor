const vscode = acquireVsCodeApi();

var app = new Vue({
  el: "#app",
  data: {
    search: "",
    metadataArray: new Array(),
    rowArray: new Array(),
    selectionArray: new Array(),
    dragRow: undefined,
    dragIndex: undefined
  },
  methods: {
    // Sort

    sortRows: function () {
      this.rowArray = this.rowArray.sort((a, b) => {
        if (a.key < b.key) {
          return -1;
        }
        if (a.key > b.key) {
          return 1;
        }

        return 0;
      });
    },

    // Add

    addRow: function () {
      const row = { key: "" };
      for (const metadata of this.metadataArray) {
        row[metadata.langCode] = "";
      }
      this.rowArray.push(row);
    },

    // Save

    _saveRows: function (_rowArray) {
      const message = {
        type: "webview.save",
        metadataArray: this.metadataArray,
        rowArray: _rowArray,
      };
      vscode.postMessage(message);
    },
    saveRows: function () {
      const _rowArray = new Array();

      const successCache = new Set();
      const errorCache = new Array();

      for (const item of this.rowArray) {
        if (typeof item.key === "string" && item.key !== "" && !successCache.has(item.key)) {
          successCache.add(item.key);
          _rowArray.push(item);
        } else {
          errorCache.push(item.key);
        }
      }

      const errorLength = errorCache.length;
      const isSingular = errorLength === 1;

      if (errorLength > 0) {
        const confirmationMessage = `<b>${errorLength}</b> ${isSingular ? "row" : "rows"} will not be saved due ` +
          `duplicated or empty ${isSingular ? "key" : "keys"}.</br>Do you wish to continue?`;

        this.$buefy.dialog.confirm({
          message: confirmationMessage,
          onConfirm: () => this._saveRows(_rowArray),
        });
      } else {
        this._saveRows(_rowArray);
      }
    },

    // Delete

    deleteRows: function () {
      const selectedKeys = this.selectionArray.map((el) => `<i>${el.key}</i>`).join("</br>");
      const selectionLength = this.selectionArray.length;
      const isSingular = selectionLength === 1;

      this.$buefy.dialog.confirm({
        message: `The following ${isSingular ? "entry" : `<b>${selectionLength}</b> entries`} will be deleted:` +
          `</br>${selectedKeys}</br>` +
          `Do you want to continue?`,
        onConfirm: () => {
          this.rowArray = this.rowArray.filter(
            (el) => !this.selectionArray.includes(el)
          );
          this.selectionArray = new Array();
        },
      });
    },

    // Case

    keysToUpper: function () {
      for (const row of this.selectionArray) {
        row.key = row.key.toUpperCase();
      }
    },
    allToUpper: function () {
      for (const row of this.selectionArray) {
        for (const metadata of this.metadataArray) {
          row[metadata.langCode] = row[metadata.langCode].toUpperCase();
        }
      }
    },
    someToUpper: function (langCode) {
      for (const row of this.selectionArray) {
        row[langCode] = row[langCode].toUpperCase();
      }
    },

    // Drag

    dragstart(payload) {
      this.dragRow = payload.row;
      this.dragIndex = payload.index;
      payload.event.dataTransfer.effectAllowed = "copy";
    },
    dragover(payload) {
      payload.event.dataTransfer.dropEffect = "copy";
      payload.event.target.closest("tr").classList.add("is-selected");
      payload.event.preventDefault();
    },
    dragleave(payload) {
      payload.event.target.closest("tr").classList.remove("is-selected");
      payload.event.preventDefault();
    },
    drop(payload) {
      payload.event.target.closest("tr").classList.remove("is-selected");

      this.rowArray.splice(this.dragIndex, 1, payload.row);
      this.rowArray.splice(payload.index, 1, this.dragRow);

      this.dragRow = undefined;
      this.dragIndex = undefined;
    }
  },
  computed: {
    hasSelection: function () {
      return this.selectionArray.length > 0;
    }
  },
  watch: {
    selectionArray: {
      deep: true,
      handler: function () {
        if (!this.selectionArray.length && this.$refs.dropdown.isActive) {
          this.$refs.dropdown.toggle();
        }
      }
    }
  },
  created: function () {
    window.addEventListener("message", (event) => {
      console.log(event);
      this.metadataArray = event.data.metadataArray;
      this.rowArray = event.data.rowArray;
    });

    const message = { type: "webview.ready" };
    vscode.postMessage(message);
  }
});