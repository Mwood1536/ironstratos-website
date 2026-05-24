# One-shot script to create the 3 lead-gen databases under the CC Hub.
# Idempotent: re-running will create duplicates, so only run once.

param(
  [string]$Token = $env:NOTION_TOKEN,
  [string]$ParentPageId = "3577a959-3479-8142-9458-dc5fb0778f7b"
)

if (-not $Token) { throw "Set NOTION_TOKEN env var first." }

$Headers = @{
  Authorization     = "Bearer $Token"
  "Notion-Version"  = "2025-09-03"
  "Content-Type"    = "application/json; charset=utf-8"
}

function New-NotionDb {
  param([string]$Title, [hashtable]$Props)

  $body = @{
    parent     = @{ type = "page_id"; page_id = $ParentPageId }
    title      = @(@{ type = "text"; text = @{ content = $Title } })
    properties = $Props
  } | ConvertTo-Json -Depth 12 -Compress

  $bytes = [System.Text.Encoding]::UTF8.GetBytes($body)
  $r = Invoke-RestMethod -Uri "https://api.notion.com/v1/databases" -Method POST -Headers $Headers -Body $bytes
  [pscustomobject]@{
    Title           = $Title
    DatabaseId      = $r.id
    DataSourceId    = $r.data_sources[0].id
    Url             = $r.url
  }
}

# 1) CC Newsletter Subscribers
$newsletter = New-NotionDb -Title "CC Newsletter Subscribers" -Props @{
  "Email"           = @{ title = @{} }
  "Date Subscribed" = @{ created_time = @{} }
  "Source Page"     = @{ rich_text = @{} }
  "Status"          = @{ select = @{ options = @(
                            @{ name = "Active";       color = "green" },
                            @{ name = "Unsubscribed"; color = "gray"  }
                        ) } }
}

# 2) CC Beta Interest
$beta = New-NotionDb -Title "CC Beta Interest" -Props @{
  "Email"               = @{ title = @{} }
  "Name"                = @{ rich_text = @{} }
  "Company"             = @{ rich_text = @{} }
  "Role"                = @{ rich_text = @{} }
  "Which App"           = @{ select = @{ options = @(
                                @{ name = "Root Cause AI"; color = "orange" },
                                @{ name = "NConform";      color = "blue"   },
                                @{ name = "Both";          color = "purple" }
                            ) } }
  "Plant Size"          = @{ select = @{ options = @(
                                @{ name = "<10";     color = "gray"   },
                                @{ name = "10-50";   color = "blue"   },
                                @{ name = "50-200";  color = "green"  },
                                @{ name = "200-500"; color = "yellow" },
                                @{ name = "500+";    color = "orange" },
                                @{ name = "Unknown"; color = "default"}
                            ) } }
  "Current RCA Process" = @{ rich_text = @{} }
  "Date Submitted"      = @{ created_time = @{} }
  "Status"              = @{ select = @{ options = @(
                                @{ name = "New";       color = "yellow" },
                                @{ name = "Contacted"; color = "blue"   },
                                @{ name = "Onboarded"; color = "green"  },
                                @{ name = "Declined";  color = "red"    }
                            ) } }
}

# 3) CC Demo Requests
$demo = New-NotionDb -Title "CC Demo Requests" -Props @{
  "Email"           = @{ title = @{} }
  "Name"            = @{ rich_text = @{} }
  "Phone"           = @{ phone_number = @{} }
  "Company"         = @{ rich_text = @{} }
  "Title"           = @{ rich_text = @{} }
  "Plant Size"      = @{ select = @{ options = @(
                            @{ name = "<10";     color = "gray"   },
                            @{ name = "10-50";   color = "blue"   },
                            @{ name = "50-200";  color = "green"  },
                            @{ name = "200-500"; color = "yellow" },
                            @{ name = "500+";    color = "orange" },
                            @{ name = "Unknown"; color = "default"}
                        ) } }
  "Tier Interest"   = @{ select = @{ options = @(
                            @{ name = "Pro Web";    color = "orange" },
                            @{ name = "Enterprise"; color = "purple" },
                            @{ name = "Not Sure";   color = "gray"   }
                        ) } }
  "Timeline"        = @{ select = @{ options = @(
                            @{ name = "Now";              color = "red"    },
                            @{ name = "1-3 months";       color = "orange" },
                            @{ name = "3-6 months";       color = "yellow" },
                            @{ name = "Just researching"; color = "gray"   }
                        ) } }
  "Problem"         = @{ rich_text = @{} }
  "Date Submitted"  = @{ created_time = @{} }
  "Status"          = @{ select = @{ options = @(
                            @{ name = "New";         color = "yellow" },
                            @{ name = "Scheduled";   color = "blue"   },
                            @{ name = "Demoed";      color = "purple" },
                            @{ name = "Closed Won";  color = "green"  },
                            @{ name = "Closed Lost"; color = "red"    }
                        ) } }
  "Estimated Value" = @{ number = @{ format = "dollar" } }
}

@($newsletter, $beta, $demo) | Format-List
