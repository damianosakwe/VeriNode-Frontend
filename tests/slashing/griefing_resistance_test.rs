#[cfg(test)]
mod tests {
    #[path = "../../src/slashing/mempool.rs"]
    mod mempool;

    use mempool::{SlashingMempool, Evidence, Error};

    #[test]
    fn test_slashing_condition_engine_griefing_resistance() {
        let mut mempool = SlashingMempool::new();
        let victim_validator = 42;

        // Submit the first evidence entry
        let result = mempool.push_evidence(Evidence {
            validator_index: victim_validator,
            data: vec![1, 2, 3],
        });
        assert!(result.is_ok(), "First evidence should be processed successfully");

        // Submit the remaining 99 evidence entries (minimal-evidence flood)
        for _ in 0..99 {
            let result = mempool.push_evidence(Evidence {
                validator_index: victim_validator,
                data: vec![1, 2, 3], // duplicate payload
            });
            assert_eq!(
                result,
                Err(Error::OverflowError),
                "Subsequent evidence for the same validator in the same epoch should be rejected"
            );
        }

        // Verify that the mempool only contains the single first valid evidence
        let drained = mempool.drain_all();
        assert_eq!(drained.len(), 1, "Mempool should contain exactly 1 evidence");
        assert_eq!(drained[0].validator_index, victim_validator);

        // Verify epoch boundary reset works
        mempool.reset_epoch();
        let reset_result = mempool.push_evidence(Evidence {
            validator_index: victim_validator,
            data: vec![4, 5, 6],
        });
        assert!(reset_result.is_ok(), "Evidence should be accepted again after epoch reset");
    }
}
