import os
import uvicorn

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    # Configure uvicorn with extended timeout for long-running video generation
    uvicorn.run(
        "app.main:app", 
        host="0.0.0.0", 
        port=port, 
        log_level="info",
        timeout_keep_alive=600,  # 5 minutes keep-alive
    )
