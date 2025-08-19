# Failed attempts and banned IPs
failed_attempts = {}
banned_ips = set()
BAN_THRESHOLD = 3

def failed_attempt(client_ip):
    """
    Record a failed attempt for a client IP.
    Return True if the IP is banned, False otherwise.
    """
    is_banned = False
    failed_attempts[client_ip] = failed_attempts.get(client_ip, 0) + 1
    if failed_attempts[client_ip] >= BAN_THRESHOLD:
        banned_ips.add(client_ip)
        is_banned = True

    return is_banned

def is_banned(client_ip):
    """
    Check if a client IP is banned.
    """
    return client_ip in banned_ips