/*
Backfill script: move responses stored inside activities.responses into activity_submissions table.
Usage:
  1) npm install @supabase/supabase-js
  2) Set env vars: SUPABASE_URL, SUPABASE_KEY
  3) node scripts/backfill_submissions.js
*/

const { createClient } = require('@supabase/supabase-js');

async function run() {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_KEY;
    if (!url || !key) {
        console.error('Please set SUPABASE_URL and SUPABASE_KEY');
        process.exit(1);
    }

    const supabase = createClient(url, key);

    const { data: activities, error: actErr } = await supabase.from('activities').select('*');
    if (actErr) { console.error('Failed to fetch activities', actErr); process.exit(1); }

    for (const act of activities) {
        const responses = act.responses || [];
        for (const r of responses) {
            // check existing
            const { data: exists } = await supabase.from('activity_submissions').select('id').eq('activity_id', act.id).eq('submitted_at', r.submitted_at || null).limit(1);
            if (exists && exists.length) {
                console.log('Skipping existing submission for', act.id, r.autor);
                continue;
            }

            const payload = {
                activity_id: act.id,
                student_name: r.autor || null,
                response_text: r.texto || r.text || null,
                attachment_url: (r.imagens && r.imagens[0]) ? (r.imagens[0].url || r.imagens[0].data) : null,
                status: 'enviada',
                submitted_at: r.submitted_at ? new Date(r.submitted_at).toISOString() : new Date().toISOString()
            };

            const { data: ins, error: insErr } = await supabase.from('activity_submissions').insert(payload).select();
            if (insErr) console.warn('Failed insert submission for', act.id, insErr);
            else console.log('Inserted submission for', act.id, ins.aut[0] || ins[0]);
        }
    }
    console.log('Backfill finished');
}

run().catch(e => { console.error(e); process.exit(1); });
