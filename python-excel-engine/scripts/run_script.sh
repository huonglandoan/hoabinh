#!/bin/bash
# Script to run Python scripts inside python-excel-engine with arguments
# Usage: ./run_script.sh <script_name.py> [arg1] [arg2] ...

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

if [ -z "$1" ]; then
    echo "Usage: $0 <script_name.py> [arg1] [arg2] ..."
    exit 1
fi

SCRIPT_NAME="$1"
shift

python3 "$SCRIPT_NAME" "$@"
