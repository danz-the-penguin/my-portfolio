mod utils;

use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct SolverEngine {
    gaddag: Vec<u32>,
}

#[wasm_bindgen]
impl SolverEngine {
    #[wasm_bindgen(constructor)]
    pub fn new() -> SolverEngine {
        utils::set_panic_hook();
        SolverEngine {
            gaddag: Vec::new(),
        }
    }

    pub fn load_gaddag(&mut self, gaddag: &[u32]) {
        self.gaddag = gaddag.to_vec();
    }

    pub fn fast_solve(&self, board: &[u8], rack_counts: &[u8], wildcards: u8) -> js_sys::Float64Array {
        // dummy return
        let arr = js_sys::Float64Array::new_with_length(0);
        arr
    }
}
