pub mod entrypoint;
pub mod errors;
pub mod instruction;
pub mod processor;
pub mod state;

// Export public APIs
pub use instruction::*;
pub use state::*;

solana_program::declare_id!("DKgxkYsEQmVY1Sya7MGSaKVGXazLDHzk696ooMrZLd2F");
