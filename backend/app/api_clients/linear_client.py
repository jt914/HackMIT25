"""
Linear API client for fetching tickets and team information.
"""

from typing import List, Dict, Any
import aiohttp
import app.constants as constants


class LinearClient:
    def __init__(self, api_key: str = None):
        self.api_key = api_key or constants.LINEAR_API_KEY
        self.base_url = "https://api.linear.app/graphql"

    async def _make_request(
        self, query: str, variables: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """Make a GraphQL request to Linear API."""
        headers = {"Authorization": self.api_key, "Content-Type": "application/json"}

        payload = {"query": query, "variables": variables or {}}

        async with aiohttp.ClientSession() as session:
            async with session.post(
                self.base_url, headers=headers, json=payload
            ) as response:
                if response.status != 200:
                    raise Exception(f"Linear API request failed: {response.status}")

                data = await response.json()

                if "errors" in data:
                    raise Exception(f"Linear API errors: {data['errors']}")

                return data["data"]

    async def get_team_ids(self) -> List[str]:
        """Get the team ID for the authenticated user."""
        query = """
        query GetTeamIds {
          teams {
            nodes {
              id
              name
            }
          }
        }
        """

        data = await self._make_request(query)
        teams = data["teams"]["nodes"]

        if not teams:
            raise Exception("No teams found for this API key")

        # Return all team IDs
        return [team["id"] for team in teams]

    async def fetch_team_tickets(
        self, team_id: str, limit: int = 100
    ) -> List[Dict[str, Any]]:
        """Fetch tickets for a team with inprogress, cancelled, or shipped states."""

        query = """
        query GetTeamTickets($teamId: String!, $first: Int!) {
          team(id: $teamId) {
            issues(
              filter: {
                state: {
                  name: {
                    in: ["In Progress", "Cancelled", "Done", "Shipped"]
                  }
                }
              }
              first: $first
            ) {
              nodes {
                id
                identifier
                title
                description
                url
                state {
                  name
                }
                priority
                estimate
                labels {
                  nodes {
                    name
                  }
                }
                assignee {
                  name
                  email
                }
                creator {
                  name
                  email
                }
                createdAt
                updatedAt
                completedAt
                project {
                  name
                }
              }
            }
          }
        }
        """

        variables = {"teamId": team_id, "first": limit}

        data = await self._make_request(query, variables)
        return data["team"]["issues"]["nodes"]

    def process_ticket(self, ticket: Dict[str, Any]) -> tuple[str, Dict[str, Any]]:
        """Process a ticket into content and metadata for indexing."""

        # Extract labels
        labels = []
        if ticket.get("labels") and ticket["labels"].get("nodes"):
            labels = [
                label["name"]
                for label in ticket["labels"]["nodes"]
                if label.get("name")
            ]

        # Format people info
        assignee_info = "Unassigned"
        if ticket.get("assignee"):
            name = ticket["assignee"].get("name", "Unknown")
            email = ticket["assignee"].get("email", "")
            assignee_info = f"{name} ({email})" if email else name

        creator_info = "Unknown"
        if ticket.get("creator"):
            name = ticket["creator"].get("name", "Unknown")
            email = ticket["creator"].get("email", "")
            creator_info = f"{name} ({email})" if email else name

        # Build metadata
        metadata = {
            "data_type": "linear_ticket",
            "ticket_id": ticket["id"],
            "identifier": ticket["identifier"],
            "title": ticket["title"],
            "state": ticket["state"]["name"],
            "url": ticket["url"],
            "created_at": ticket["createdAt"],
            "updated_at": ticket["updatedAt"],
            "source": "linear",
        }

        # Add optional fields
        for field in ["priority", "estimate", "completedAt"]:
            if ticket.get(field) is not None:
                key = "completed_at" if field == "completedAt" else field
                metadata[key] = ticket[field]

        # Add nested fields
        if ticket.get("project") and ticket["project"].get("name"):
            metadata["project"] = ticket["project"]["name"]
        if ticket.get("assignee") and ticket["assignee"].get("name"):
            metadata["assignee"] = ticket["assignee"]["name"]
        if ticket.get("creator") and ticket["creator"].get("name"):
            metadata["creator"] = ticket["creator"]["name"]
        if labels:
            metadata["labels"] = labels

        # Build content
        project_name = (
            "None"
            if not ticket.get("project")
            else ticket.get("project", {}).get("name", "None")
        )
        content_parts = [
            f"Ticket: {ticket['identifier']} - {ticket['title']}",
            f"Status: {ticket['state']['name']}",
            f"Priority: {ticket.get('priority', 'None')}",
            f"Estimate: {ticket.get('estimate', 'None')}",
            f"Project: {project_name}",
            f"Assignee: {assignee_info}",
            f"Creator: {creator_info}",
            f"Labels: {', '.join(labels) if labels else 'None'}",
            f"Created: {ticket['createdAt']}",
            f"Updated: {ticket['updatedAt']}",
        ]

        if ticket.get("completedAt"):
            content_parts.append(f"Completed: {ticket['completedAt']}")

        if ticket.get("description"):
            content_parts.append(f"\nDescription:\n{ticket['description']}")

        content_parts.append(f"\nURL: {ticket['url']}")

        return "\n".join(content_parts), metadata


# Create a default instance
linear_client = LinearClient()
