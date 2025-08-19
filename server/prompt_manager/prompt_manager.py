from random import choice

prompts = []
current_prompts = {}

with open('server/prompt_manager/prompts.txt', 'r') as f:
    prompts = f.readlines()

def get_random_prompt(client_ip) -> str:
    """
    Get a random prompt for the given client IP.
    And store it in the current_prompts dictionary.
    """
    prompt = choice(prompts).strip()
    current_prompts[client_ip] = prompt
    return prompt

def get_current_prompt(client_ip) -> str | None:
    """
    Get the current prompt for the given client IP.
    Returns None if not found.
    """
    return current_prompts.get(client_ip)