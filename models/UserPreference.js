import mongoose from 'mongoose';

const UserPreferenceSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true, // One preference doc per user
    },
    groups: {
        type: [String], // Array of group names
        default: [],
    },
    colorMap: {
        type: Map,
        of: String, // Key: "CM", "TD", etc. Value: Hex Code
        default: {},
    },
    hiddenEvents: {
        type: [String], // Array of Event UIDs
        default: [],
    },
    theme: {
        type: String,
        enum: ['light', 'dark', 'system'],
        default: 'system',
    },
    settings: {
        showHolidays: { type: Boolean, default: true },
        customNames: { type: Map, of: String, default: {} }, // UID -> Custom Name
        titleFormat: { type: String, default: '{type} - {name}' },
        hiddenRules: {
            type: [{
                ruleType: { type: String, enum: ['name', 'professor'] }, // 'name' (summary) or 'professor'
                value: String
            }],
            default: []
        },
        renamingRules: {
            type: Map,
            of: String, // Original Name -> New Name
            default: {}
        },
        typeMappings: {
            type: Map,
            of: String, // Type (CM, TD...) -> Custom Label
            default: {}
        }
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
});

// Update timestamp on save
UserPreferenceSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

export default mongoose.models.UserPreference || mongoose.model('UserPreference', UserPreferenceSchema);
