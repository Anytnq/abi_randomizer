/* Minimal state container (Planungs.md 7: View -> Actions -> Store -> Render).
   No reducer/middleware layer - a plain patch+subscribe store is all this
   slice needs; grows into actions.js once real mutations show up. */

export function createStore(initialState) {
  let state = initialState;
  const listeners = new Set();

  function getState() {
    return state;
  }

  function setState(patch) {
    state = { ...state, ...patch };
    listeners.forEach((listener) => listener(state));
  }

  function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  return { getState, setState, subscribe };
}
