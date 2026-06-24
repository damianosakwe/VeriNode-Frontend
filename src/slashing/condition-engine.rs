use super::mempool::SlashingMempool;
use super::evidence_verifier::verify_and_apply;

pub struct ConditionEngine {
    pub mempool: SlashingMempool,
}

impl ConditionEngine {
    pub fn new(mempool: SlashingMempool) -> Self {
        Self { mempool }
    }

    pub fn process_slashing_evidence(&mut self) {
        let all_evidence = self.mempool.drain_all();
        
        for evidence in all_evidence {
            // Verify signature and apply state changes
            if let Err(e) = verify_and_apply(&evidence) {
                println!("Failed to verify evidence for validator {}: {:?}", evidence.validator_index, e);
            }
        }
    }

    pub fn on_epoch_boundary(&mut self) {
        // Reset rate limiter at epoch boundary
        self.mempool.reset_epoch();
    }
}
