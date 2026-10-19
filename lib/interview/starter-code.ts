/**
 * Language-specific starter code generators for viva scratchpad and placement defense.
 * Supports C++, Java, Python, Go, TypeScript, and JavaScript.
 */

export function getVivaStarterCode(
  language: string,
  roleName: string = "Technical Placement",
  projectRef: string = "System Architecture",
  stackSkills: string = "Core Fundamentals & Optimization"
): string {
  const lang = (language || "").toLowerCase().trim();

  if (lang === "cpp" || lang === "c++") {
    return `// ──────────────────────────────────────────────
// ${roleName} Viva Scratchpad
// Language: C++ (C++20 / STL) | Stack: ${stackSkills}
// ──────────────────────────────────────────────
// Use this scratchpad when the interviewer asks you to write or optimize
// a core algorithm, data structure, memory-safe component, or handler.

#include <iostream>
#include <vector>
#include <string>
#include <memory>
#include <unordered_map>

class Solution {
public:
    // Core handler / logic component for ${projectRef}
    bool processRequest(const std::string& payload) {
        // Implement your solution here when requested by the interviewer
        std::cout << "Processing request for ${projectRef}: " << payload << std::endl;
        return true;
    }
};

int main() {
    Solution handler;
    handler.processRequest("sample_data");
    return 0;
}
`;
  }

  if (lang === "java") {
    return `// ──────────────────────────────────────────────
// ${roleName} Viva Scratchpad
// Language: Java | Stack: ${stackSkills}
// ──────────────────────────────────────────────
// Use this scratchpad when the interviewer asks you to write or optimize
// a service method, data model, or architecture component.

import java.util.*;

public class Main {
    // Service handler for ${projectRef}
    public static Map<String, Object> handleRequest(Map<String, Object> payload) {
        // Implement your solution here when requested by the interviewer
        Map<String, Object> response = new HashMap<>();
        response.put("status", "ok");
        response.put("role", "${roleName}");
        response.put("timestamp", System.currentTimeMillis());
        return response;
    }

    public static void main(String[] args) {
        Map<String, Object> payload = new HashMap<>();
        System.out.println(handleRequest(payload));
    }
}
`;
  }

  if (lang === "python") {
    return `# ──────────────────────────────────────────────
# ${roleName} Viva Scratchpad
# Language: Python 3 | Stack: ${stackSkills}
# ──────────────────────────────────────────────
# Use this scratchpad when the interviewer asks you to write or optimize
# an API route, helper function, or data transformation.

from typing import Dict, Any

def handle_request(request_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Example handler for processing ${projectRef} requests.
    """
    # Write your implementation here when requested by the interviewer
    return {
        "status": "ok",
        "role": "${roleName}",
        "project": "${projectRef}",
    }

if __name__ == "__main__":
    print(handle_request({"test": True}))
`;
  }

  if (lang === "go" || lang === "golang") {
    return `// ──────────────────────────────────────────────
// ${roleName} Viva Scratchpad
// Language: Go | Stack: ${stackSkills}
// ──────────────────────────────────────────────
// Use this scratchpad when the interviewer asks you to write or optimize
// a concurrent worker, handler, or microservice logic.

package main

import (
	"fmt"
	"time"
)

type Response struct {
	Status    string \`json:"status"\`
	Role      string \`json:"role"\`
	Timestamp int64  \`json:"timestamp"\`
}

func HandleRequest(payload map[string]interface{}) Response {
	// Write your implementation here when requested by the interviewer
	return Response{
		Status:    "ok",
		Role:      "${roleName}",
		Timestamp: time.Now().Unix(),
	}
}

func main() {
	res := HandleRequest(map[string]interface{}{})
	fmt.Printf("%+v\\n", res)
}
`;
  }

  // Default to JavaScript / TypeScript
  return `// ──────────────────────────────────────────────
// ${roleName} Viva Scratchpad
// Language: JavaScript / TypeScript | Stack: ${stackSkills}
// ──────────────────────────────────────────────
// Use this scratchpad when the interviewer asks you to write or optimize
// an API endpoint, middleware, or system component.

/**
 * API handler for ${projectRef}
 * @param {object} req - Incoming request payload
 * @param {object} res - Response stream
 */
export async function handleRequest(req, res) {
  // Write your implementation here when requested by the interviewer
  return {
    success: true,
    role: "${roleName}",
    project: "${projectRef}",
    timestamp: Date.now(),
  };
}
`;
}
