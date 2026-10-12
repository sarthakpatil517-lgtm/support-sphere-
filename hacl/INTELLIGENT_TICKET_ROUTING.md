# Module 7: Intelligent Ticket Routing & Escalation

## Run and test

Run `npm install` and then `npm run dev` from the project folder. Open **Intelligent Ticket Routing** from the module switcher. Run tests with `npm test`.

## Routing logic

Routing uses explicit team configuration, not machine learning. It first narrows to active teams supporting the ticket category (including legacy category aliases), then requires a match for every supplied skill. Unavailable and full teams are excluded. Remaining teams are ranked using free-capacity ratio, with a 20-point adjustment for `Busy` teams that still have capacity. Security tickets are only routed to the configured designated security team; when it is missing, unavailable, over capacity, or skill-ineligible, the module requests immediate manual review. Category, skill, availability, and workload details are included in the explanation. With no eligible team, the module requests manual assignment rather than selecting an unrelated team.

## Escalation

Critical urgency creates an immediate-review escalation reason. Priority at or above the configurable threshold, security category, unresolved contacts at or above the configured count, no eligible team, and a saved unassigned ticket whose age meets the configurable duration also produce escalation reasons. Security cases recommend the configured security destination; other cases recommend the configured default escalation role. Unassigned age is measured from when the module first saved the routing record and is checked again when a recommendation is requested; there is no background timer. Recommendations do not send external alerts. Confirmed **Escalate Ticket** writes an internal `Escalated` status and audit record only.

Assignment and reassignment require browser confirmation and are reported successful only after the API write succeeds. Changes are stored separately from the existing customer ticket records. Manual-review overrides, assignments, and escalations are retained in the routing audit history.

## Data and limitations

Routing data uses the project's LowDB JSON database (`server/data/tickets.json`). Initial teams and open-ticket counts are explicitly marked as sample configuration, not live operations. Replacing these settings with authorized operational data is necessary before production use. This project has no authentication or authorization layer, so team maintenance and routing actions are currently available to any user who can access the app. External notification integrations are not configured. The routing module uses manually entered ticket details and does not depend on other prediction modules.
