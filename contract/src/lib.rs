#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short,
    Address, Env, String, Symbol, Vec, Map,
    log, events,
};

// ─── Storage Keys ────────────────────────────────────────────────────────────

const QUESTION_KEY: Symbol = symbol_short!("QUESTION");
const OPTIONS_KEY: Symbol  = symbol_short!("OPTIONS");
const VOTES_KEY: Symbol    = symbol_short!("VOTES");
const INIT_KEY: Symbol     = symbol_short!("INIT");
const POLL_ID_KEY: Symbol  = symbol_short!("POLL_ID");

// ─── Data Types ──────────────────────────────────────────────────────────────

#[contracttype]
#[derive(Clone, Debug)]
pub struct PollData {
    pub question: String,
    pub options: Vec<String>,
    pub vote_counts: Vec<u32>,
    pub total_votes: u32,
}

// ─── Contract ────────────────────────────────────────────────────────────────

#[contract]
pub struct StellarLivePoll;

#[contractimpl]
impl StellarLivePoll {

    // ── Initialize Poll ──────────────────────────────────────────────────────
    /// Creates a new poll round with question and options.
    /// Any authenticated wallet can create a new round.
    /// Panics if options count is not 2-4.
    pub fn initialize_poll(
        env: Env,
        creator: Address,
        question: String,
        options: Vec<String>,
    ) {
        // Require creator auth
        creator.require_auth();

        // Validate options count
        let opt_len = options.len();
        if opt_len < 2 || opt_len > 4 {
            panic!("Poll must have 2 to 4 options");
        }

        // Build zero vote counts
        let mut vote_counts: Vec<u32> = Vec::new(&env);
        for _ in 0..opt_len {
            vote_counts.push_back(0u32);
        }

        // Increment poll id so voter state is scoped per poll round.
        let prev_poll_id: u32 = env.storage().instance().get(&POLL_ID_KEY).unwrap_or(0u32);
        let next_poll_id = prev_poll_id + 1;

        // Store data for the current round
        env.storage().instance().set(&QUESTION_KEY, &question);
        env.storage().instance().set(&OPTIONS_KEY, &options);
        env.storage().instance().set(&VOTES_KEY, &vote_counts);
        env.storage().instance().set(&POLL_ID_KEY, &next_poll_id);
        env.storage().instance().set(&INIT_KEY, &true);

        // Emit PollInitialized event
        env.events().publish(
            (symbol_short!("poll"), symbol_short!("init")),
            question,
        );

        log!(&env, "Poll {} initialized with {} options", next_poll_id, opt_len);
    }

    // ── Vote ─────────────────────────────────────────────────────────────────
    /// Cast a vote for the given option index.
    /// Panics if: poll not initialized, already voted, invalid option index.
    pub fn vote(env: Env, voter: Address, option_index: u32) {
        // Require voter auth
        voter.require_auth();

        // Ensure poll is initialized
        let initialized: bool = env.storage().instance().get(&INIT_KEY).unwrap_or(false);
        if !initialized {
            panic!("Poll not yet initialized");
        }

        // Check double voting using persistent storage keyed by poll_id + voter
        let poll_id: u32 = env.storage().instance().get(&POLL_ID_KEY).unwrap_or(0u32);
        if poll_id == 0 {
            panic!("Poll not yet initialized");
        }

        let voter_key = (symbol_short!("voter"), poll_id, voter.clone());
        let already_voted: bool = env.storage().persistent().get(&voter_key).unwrap_or(false);
        if already_voted {
            panic!("Address has already voted");
        }

        // Validate option index
        let options: Vec<String> = env.storage().instance().get(&OPTIONS_KEY).unwrap();
        if option_index >= options.len() {
            panic!("Invalid option index");
        }

        // Update vote count for chosen option
        let mut vote_counts: Vec<u32> = env.storage().instance().get(&VOTES_KEY).unwrap();
        let current_votes = vote_counts.get(option_index).unwrap();
        vote_counts.set(option_index, current_votes + 1);
        env.storage().instance().set(&VOTES_KEY, &vote_counts);

        // Mark voter as having voted
        env.storage().persistent().set(&voter_key, &true);

        // Get the chosen option string for the event
        let chosen_option = options.get(option_index).unwrap();

        // Emit VoteCast event
        env.events().publish(
            (symbol_short!("poll"), symbol_short!("vote")),
            (voter.clone(), option_index, chosen_option),
        );

        log!(&env, "Vote cast by {:?} for option {}", voter, option_index);
    }

    // ── Get Poll ─────────────────────────────────────────────────────────────
    /// Returns full poll data: question, options, vote counts, total votes.
    pub fn get_poll(env: Env) -> PollData {
        let initialized: bool = env.storage().instance().get(&INIT_KEY).unwrap_or(false);
        if !initialized {
            panic!("Poll not yet initialized");
        }

        let question: String = env.storage().instance().get(&QUESTION_KEY).unwrap();
        let options: Vec<String> = env.storage().instance().get(&OPTIONS_KEY).unwrap();
        let vote_counts: Vec<u32> = env.storage().instance().get(&VOTES_KEY).unwrap();

        // Sum total votes
        let mut total: u32 = 0;
        for i in 0..vote_counts.len() {
            total += vote_counts.get(i).unwrap_or(0);
        }

        PollData {
            question,
            options,
            vote_counts,
            total_votes: total,
        }
    }

    // ── Get Results ──────────────────────────────────────────────────────────
    /// Returns just the vote count vector for lightweight result fetching.
    pub fn get_results(env: Env) -> Vec<u32> {
        let initialized: bool = env.storage().instance().get(&INIT_KEY).unwrap_or(false);
        if !initialized {
            panic!("Poll not yet initialized");
        }
        env.storage().instance().get(&VOTES_KEY).unwrap()
    }

    // ── Has Voted ────────────────────────────────────────────────────────────
    /// Returns true if the given address has already voted.
    pub fn has_voted(env: Env, voter: Address) -> bool {
        let initialized: bool = env.storage().instance().get(&INIT_KEY).unwrap_or(false);
        if !initialized {
            return false;
        }

        let poll_id: u32 = env.storage().instance().get(&POLL_ID_KEY).unwrap_or(0u32);
        if poll_id == 0 {
            return false;
        }

        let voter_key = (symbol_short!("voter"), poll_id, voter);
        env.storage().persistent().get(&voter_key).unwrap_or(false)
    }

    // ── Get Total Votes ──────────────────────────────────────────────────────
    /// Returns the total number of votes cast.
    pub fn get_total_votes(env: Env) -> u32 {
        let vote_counts: Vec<u32> = env.storage().instance().get(&VOTES_KEY).unwrap_or(Vec::new(&env));
        let mut total: u32 = 0;
        for i in 0..vote_counts.len() {
            total += vote_counts.get(i).unwrap_or(0);
        }
        total
    }

    // ── Is Initialized ───────────────────────────────────────────────────────
    /// Returns whether the poll has been initialized.
    pub fn is_initialized(env: Env) -> bool {
        env.storage().instance().get(&INIT_KEY).unwrap_or(false)
    }

    // ── Get Current Poll ID ─────────────────────────────────────────────────
    /// Returns the current poll round id (0 if no poll created yet).
    pub fn get_poll_id(env: Env) -> u32 {
        env.storage().instance().get(&POLL_ID_KEY).unwrap_or(0u32)
    }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::{testutils::Address as _, vec, Env};

    #[test]
    fn test_full_poll_flow() {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register_contract(None, StellarLivePoll);
        let client = StellarLivePollClient::new(&env, &contract_id);

        let creator = Address::generate(&env);
        let voter1 = Address::generate(&env);
        let voter2 = Address::generate(&env);

        let question = String::from_str(&env, "Which Stellar builder track is most exciting?");
        let options = vec![
            &env,
            String::from_str(&env, "DeFi"),
            String::from_str(&env, "NFTs"),
            String::from_str(&env, "Payments"),
            String::from_str(&env, "Open Source"),
        ];

        // Initialize
        client.initialize_poll(&creator, &question, &options);
        assert!(client.is_initialized());
        assert_eq!(client.get_poll_id(), 1u32);

        // Vote
        client.vote(&voter1, &0u32);
        client.vote(&voter2, &2u32);

        // Check has_voted
        assert!(client.has_voted(&voter1));
        assert!(!client.has_voted(&creator));

        // Get results
        let results = client.get_results();
        assert_eq!(results.get(0).unwrap(), 1u32);
        assert_eq!(results.get(2).unwrap(), 1u32);
        assert_eq!(client.get_total_votes(), 2u32);

        // Get poll
        let poll = client.get_poll();
        assert_eq!(poll.total_votes, 2u32);
    }

    #[test]
    #[should_panic(expected = "Address has already voted")]
    fn test_double_vote_fails() {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register_contract(None, StellarLivePoll);
        let client = StellarLivePollClient::new(&env, &contract_id);

        let creator = Address::generate(&env);
        let voter = Address::generate(&env);

        let question = String::from_str(&env, "Test?");
        let options = vec![
            &env,
            String::from_str(&env, "Yes"),
            String::from_str(&env, "No"),
        ];

        client.initialize_poll(&creator, &question, &options);
        client.vote(&voter, &0u32);
        client.vote(&voter, &1u32); // should panic
    }

    #[test]
    fn test_reinitialize_creates_new_poll_round() {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register_contract(None, StellarLivePoll);
        let client = StellarLivePollClient::new(&env, &contract_id);

        let creator1 = Address::generate(&env);
        let creator2 = Address::generate(&env);
        let voter = Address::generate(&env);

        let q1 = String::from_str(&env, "Poll 1?");
        let o1 = vec![
            &env,
            String::from_str(&env, "A"),
            String::from_str(&env, "B"),
        ];

        client.initialize_poll(&creator1, &q1, &o1);
        client.vote(&voter, &0u32);
        assert!(client.has_voted(&voter));
        assert_eq!(client.get_poll_id(), 1u32);
        assert_eq!(client.get_total_votes(), 1u32);

        let q2 = String::from_str(&env, "Poll 2?");
        let o2 = vec![
            &env,
            String::from_str(&env, "X"),
            String::from_str(&env, "Y"),
            String::from_str(&env, "Z"),
        ];

        client.initialize_poll(&creator2, &q2, &o2);
        assert_eq!(client.get_poll_id(), 2u32);
        assert_eq!(client.get_total_votes(), 0u32);
        assert!(!client.has_voted(&voter));

        // The same wallet can vote in the new round.
        client.vote(&voter, &2u32);
        assert!(client.has_voted(&voter));
        assert_eq!(client.get_total_votes(), 1u32);
    }
}
