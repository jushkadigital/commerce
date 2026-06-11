"use strict";Object.defineProperty(exports, "__esModule", {value: true});







var _FHPV2Q7Ccjs = require('./FHPV2Q7C.cjs');







var _JBOLBTVUcjs = require('./JBOLBTVU.cjs');

// ../ariakit-react-components/dist/collection/collection-context.js
var ctx = _JBOLBTVUcjs.createStoreContext.call(void 0, );
var useCollectionContext = ctx.useContext;
var useCollectionScopedContext = ctx.useScopedContext;
var useCollectionProviderContext = ctx.useProviderContext;
var CollectionContextProvider = ctx.ContextProvider;
var CollectionScopedContextProvider = ctx.ScopedContextProvider;

// ../ariakit-components/dist/collection/collection-store.js
function getCommonParent(items) {
  var _a, _b;
  const firstItem = items.find((item) => !!item.element);
  const lastElement = (_a = [...items].reverse().find((item) => !!item.element)) == null ? void 0 : _a.element;
  let parentElement = (_b = firstItem == null ? void 0 : firstItem.element) == null ? void 0 : _b.parentElement;
  if (!lastElement) return _JBOLBTVUcjs.getDocument.call(void 0, parentElement).body;
  while (parentElement) {
    if (parentElement.contains(lastElement)) return parentElement;
    parentElement = parentElement.parentElement;
  }
  return _JBOLBTVUcjs.getDocument.call(void 0, parentElement).body;
}
function getPrivateStore(store) {
  return store == null ? void 0 : store.__unstablePrivateStore;
}
function createCollectionStore(props = {}) {
  var _a;
  _FHPV2Q7Ccjs.throwOnConflictingProps.call(void 0, props, props.store);
  const syncState = (_a = props.store) == null ? void 0 : _a.getState();
  const items = _JBOLBTVUcjs.defaultValue.call(void 0, props.items, syncState == null ? void 0 : syncState.items, props.defaultItems, []);
  const itemsMap = new Map(items.map((item) => [item.id, item]));
  const initialState = {
    items,
    renderedItems: _JBOLBTVUcjs.defaultValue.call(void 0, syncState == null ? void 0 : syncState.renderedItems, [])
  };
  const syncPrivateStore = getPrivateStore(props.store);
  const privateStore = _FHPV2Q7Ccjs.createStore.call(void 0, {
    items,
    renderedItems: initialState.renderedItems
  }, syncPrivateStore);
  const collection = _FHPV2Q7Ccjs.createStore.call(void 0, initialState, props.store);
  const sortItems = (renderedItems) => {
    const sortedItems = _JBOLBTVUcjs.sortBasedOnDOMPosition.call(void 0, renderedItems, (i) => i.element);
    privateStore.setState("renderedItems", sortedItems);
    collection.setState("renderedItems", sortedItems);
  };
  _FHPV2Q7Ccjs.setup.call(void 0, collection, () => _FHPV2Q7Ccjs.init.call(void 0, privateStore));
  _FHPV2Q7Ccjs.setup.call(void 0, privateStore, () => {
    return _FHPV2Q7Ccjs.batch.call(void 0, privateStore, ["items"], (state) => {
      collection.setState("items", state.items);
    });
  });
  _FHPV2Q7Ccjs.setup.call(void 0, privateStore, () => {
    return _FHPV2Q7Ccjs.batch.call(void 0, privateStore, ["renderedItems"], (state) => {
      let firstRun = true;
      let raf = requestAnimationFrame(() => {
        const { renderedItems } = collection.getState();
        if (state.renderedItems === renderedItems) return;
        sortItems(state.renderedItems);
      });
      if (typeof IntersectionObserver !== "function") return () => cancelAnimationFrame(raf);
      const ioCallback = () => {
        if (firstRun) {
          firstRun = false;
          return;
        }
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => sortItems(state.renderedItems));
      };
      const root = getCommonParent(state.renderedItems);
      const observer = new IntersectionObserver(ioCallback, { root });
      for (const item of state.renderedItems) {
        if (!item.element) continue;
        observer.observe(item.element);
      }
      return () => {
        cancelAnimationFrame(raf);
        observer.disconnect();
      };
    });
  });
  const mergeItem = (item, setItems, canDeleteFromMap = false) => {
    let prevItem;
    setItems((items2) => {
      const index = items2.findIndex(({ id }) => id === item.id);
      const nextItems = items2.slice();
      if (index !== -1) {
        prevItem = items2[index];
        const nextItem = {
          ...prevItem,
          ...item
        };
        nextItems[index] = nextItem;
        itemsMap.set(item.id, nextItem);
      } else {
        nextItems.push(item);
        itemsMap.set(item.id, item);
      }
      return nextItems;
    });
    const unmergeItem = () => {
      setItems((items2) => {
        if (!prevItem) {
          if (canDeleteFromMap) itemsMap.delete(item.id);
          return items2.filter(({ id }) => id !== item.id);
        }
        const index = items2.findIndex(({ id }) => id === item.id);
        if (index === -1) return items2;
        const nextItems = items2.slice();
        nextItems[index] = prevItem;
        itemsMap.set(item.id, prevItem);
        return nextItems;
      });
    };
    return unmergeItem;
  };
  const registerItem = (item) => mergeItem(item, (getItems) => privateStore.setState("items", getItems), true);
  return {
    ...collection,
    registerItem,
    renderItem: (item) => _JBOLBTVUcjs.chain.call(void 0, registerItem(item), mergeItem(item, (getItems) => privateStore.setState("renderedItems", getItems))),
    item: (id) => {
      if (!id) return null;
      let item = itemsMap.get(id);
      if (!item) {
        const { items: items2 } = privateStore.getState();
        item = items2.find((item2) => item2.id === id);
        if (item) itemsMap.set(id, item);
      }
      return item || null;
    },
    __unstablePrivateStore: privateStore
  };
}

// ../ariakit-react-components/dist/collection/collection-store.js
function useCollectionStoreProps(store, update, props) {
  _JBOLBTVUcjs.useUpdateEffect.call(void 0, update, [props.store]);
  _FHPV2Q7Ccjs.useStoreProps.call(void 0, store, props, "items", "setItems");
  return store;
}
function useCollectionStore(props = {}) {
  const [store, update] = _FHPV2Q7Ccjs.useStore.call(void 0, createCollectionStore, props);
  return useCollectionStoreProps(store, update, props);
}









exports.useCollectionContext = useCollectionContext; exports.useCollectionProviderContext = useCollectionProviderContext; exports.CollectionContextProvider = CollectionContextProvider; exports.CollectionScopedContextProvider = CollectionScopedContextProvider; exports.createCollectionStore = createCollectionStore; exports.useCollectionStoreProps = useCollectionStoreProps; exports.useCollectionStore = useCollectionStore;
