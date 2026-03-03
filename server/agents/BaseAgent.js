/**
 * Base class for all AI Agents in the Amplifyer system.
 * This class handles communication and basic logging for agents.
 */
class BaseAgent {
  constructor(name, description) {
    this.name = name;
    this.description = description;
  }

  log(message) {
    console.log(`[${this.name}] ${message}`);
  }

  async run(input) {
    throw new Error('Run method must be implemented by the child agent.');
  }
}

module.exports = BaseAgent;
