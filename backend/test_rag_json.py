"""
Test RAG service with JSON input/output
Simulates how Node.js will call the Python service
"""
import json
import subprocess
import sys
from pathlib import Path

# Test commands
test_commands = [
    # 1. Initialize
    {
        "command": "initialize",
        "careers_json_path": "./careers_cleaned.json",
        "chroma_persist_dir": "./chroma_data_full",
        "provider": "google"
    },
    # 2. Chat
    {
        "command": "chat",
        "message": "What careers are good for someone who likes technology?",
        "chat_history": []
    }
]


def test_rag_service():
    """Test the RAG service with JSON commands"""

    print("=" * 60)
    print("Testing RAG Service with JSON")
    print("=" * 60)

    # Get paths
    backend_dir = Path(__file__).parent
    script_path = backend_dir / "src" / "services" / "rag_service.py"

    print(f"\n📁 Backend directory: {backend_dir}")
    print(f"📄 Script path: {script_path}")
    print(f"📊 Data files:")
    print(
        f"   - careers_cleaned.json: {(backend_dir / 'careers_cleaned.json').exists()}")
    print(
        f"   - chroma_data_full: {(backend_dir / 'chroma_data_full').exists()}")

    # Check Python executable
    python_exe = sys.executable
    print(f"\n🐍 Python: {python_exe}")

    # Combine all commands into a single input with newlines
    # Each command on its own line
    combined_input = "\n".join([json.dumps(cmd) for cmd in test_commands])

    print(f"\n📤 Sending all commands in single process:")
    for i, cmd in enumerate(test_commands, 1):
        print(f"   {i}. {cmd['command']}")

    try:
        # Run the Python script ONCE with all commands
        process = subprocess.Popen(
            [python_exe, str(script_path)],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            cwd=str(backend_dir),
            text=True
        )

        # Send all commands at once
        stdout, stderr = process.communicate(input=combined_input, timeout=60)

        # Show stderr (debug output)
        if stderr:
            print(f"\n🔍 Debug output (stderr):")
            print(stderr)

        # Parse and show all responses
        if stdout:
            print(f"\n📥 Response(s):")
            responses = stdout.strip().split('\n')

            for i, response_line in enumerate(responses, 1):
                print(f"\n{'-'*60}")
                print(f"Response {i}:")
                print(f"{'-'*60}")

                try:
                    response = json.loads(response_line)
                    print(json.dumps(response, indent=2))

                    # Check status
                    if response.get("status") == "success":
                        cmd_name = test_commands[i-1]['command'] if i <= len(
                            test_commands) else 'unknown'
                        print(f"\n✅ {cmd_name.upper()} - SUCCESS")

                        # Show chat response if available
                        if response.get('data'):
                            data = response['data']
                            if data.get('response'):
                                print(f"\n💬 Response:")
                                response_text = data['response']
                                if len(response_text) > 300:
                                    print(f"{response_text[:300]}...")
                                else:
                                    print(response_text)
                            if data.get('sources'):
                                print(
                                    f"\n📚 Sources: {len(data['sources'])} documents retrieved")
                                for j, source in enumerate(data['sources'][:2], 1):
                                    print(
                                        f"   {j}. {source.get('title', 'Unknown')}")
                    else:
                        print(f"\n❌ FAILED")
                        print(f"Error: {response.get('message')}")
                        return False

                except json.JSONDecodeError as e:
                    print(f"❌ Failed to parse JSON response: {e}")
                    print(f"Raw output: {response_line}")
                    return False
        else:
            print(f"\n⚠️  No output received")
            return False

        # Check exit code
        if process.returncode != 0:
            print(f"\n❌ Process exited with code: {process.returncode}")
            return False

    except subprocess.TimeoutExpired:
        print(f"\n❌ Timeout - process took longer than 60 seconds")
        process.kill()
        return False

    except Exception as e:
        print(f"\n❌ Error running test: {e}")
        import traceback
        traceback.print_exc()
        return False

    print(f"\n{'='*60}")
    print("✅ All tests completed successfully!")
    print(f"{'='*60}")
    return True


if __name__ == "__main__":
    print("\n🚀 Starting RAG Service JSON Test\n")

    # Check if we're in the right directory
    if not Path("careers_cleaned.json").exists():
        print("❌ ERROR: careers_cleaned.json not found in current directory")
        print(f"   Current directory: {Path.cwd()}")
        print(f"   Please run from: C:\\Users\\npkas\\HCI\\CareerBuddy\\backend")
        sys.exit(1)

    success = test_rag_service()
    sys.exit(0 if success else 1)
