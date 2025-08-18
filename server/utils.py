def is_file_size_valid(file_obj, max_size):
    """
    Checks if the file object's size is less than or equal to max_size (in bytes).
    Returns True if valid, False otherwise.
    """
    current_pos = file_obj.tell()
    file_obj.seek(0, 2)  # Move to end
    size = file_obj.tell()
    file_obj.seek(current_pos)  # Restore position
    return size <= max_size
