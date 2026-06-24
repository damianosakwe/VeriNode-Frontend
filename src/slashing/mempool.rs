use std::collections::HashMap;

pub type ValidatorIndex = u64;

#[derive(Debug, PartialEq)]
pub enum Error {
    OverflowError,
    CapacityExceeded,
}

#[derive(Debug, Clone)]
pub struct Evidence {
    pub validator_index: ValidatorIndex,
    pub data: Vec<u8>,
}

pub struct SlashingMempool {
    evidence_queue: Vec<Evidence>,
    rate_limit: HashMap<ValidatorIndex, u8>,
}

const MAX_EVIDENCE_PER_VALIDATOR_PER_EPOCH: u8 = 1;

impl SlashingMempool {
    pub fn new() -> Self {
        Self {
            evidence_queue: Vec::with_capacity(1024),
            rate_limit: HashMap::new(),
        }
    }

    pub fn push_evidence(&mut self, evidence: Evidence) -> Result<(), Error> {
        let count = self.rate_limit.entry(evidence.validator_index).or_insert(0);
        if *count >= MAX_EVIDENCE_PER_VALIDATOR_PER_EPOCH {
            return Err(Error::OverflowError);
        }
        
        if self.evidence_queue.len() >= 1024 {
            return Err(Error::CapacityExceeded);
        }

        *count += 1;
        self.evidence_queue.push(evidence);
        Ok(())
    }

    pub fn drain_all(&mut self) -> Vec<Evidence> {
        self.evidence_queue.drain(..).collect()
    }

    pub fn reset_epoch(&mut self) {
        self.rate_limit.clear();
    }
}
