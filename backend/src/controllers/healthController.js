export function getHealth(_req, res) {
  res.json({
    status: 'ok',
    service: 'lead-rubyorbit-backend',
    project: 'LeadRubyOrbit',
  })
}
